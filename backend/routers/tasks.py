from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from services.permissions import compute_effective_page_roles, require_page_role, role_at_least
import models, schemas

router = APIRouter(tags=["tasks"])


def _task_link(task: models.Task) -> str | None:
    return f"/page/{task.page_id}" if task.page_id else None


def _create_notification(db: Session, *, user_id: str, type: str, body: str, link: str | None):
    db.add(models.Notification(
        user_id=user_id,
        type=type,
        body=body,
        link=link,
        read=False,
    ))


def _notify_task_created(db: Session, task: models.Task, actor: models.User):
    if task.assignee_id and task.assignee_id != actor.id:
        _create_notification(
            db,
            user_id=task.assignee_id,
            type="task_assigned",
            body=f'{actor.name or actor.email} assigned you "{task.title}".',
            link=_task_link(task),
        )


def _notify_task_updated(db: Session, task: models.Task, actor: models.User, previous: dict):
    recipients = {uid for uid in [task.assignee_id] if uid and uid != actor.id}
    if not recipients:
        return

    if previous.get("assignee_id") != task.assignee_id and task.assignee_id and task.assignee_id != actor.id:
        _create_notification(
            db,
            user_id=task.assignee_id,
            type="task_assigned",
            body=f'{actor.name or actor.email} assigned you "{task.title}".',
            link=_task_link(task),
        )

    if previous.get("status") != task.status:
        status_label = task.status.replace("_", " ")
        for user_id in recipients:
            _create_notification(
                db,
                user_id=user_id,
                type="task_updated",
                body=f'{actor.name or actor.email} changed "{task.title}" to {status_label}.',
                link=_task_link(task),
            )

    if previous.get("due_date") != task.due_date and task.due_date:
        for user_id in recipients:
            _create_notification(
                db,
                user_id=user_id,
                type="task_updated",
                body=f'"{task.title}" is now due {task.due_date.strftime("%b %d, %I:%M %p")}.',
                link=_task_link(task),
            )


def _get_task_or_404(task_id: str, user_id: str, db: Session) -> models.Task:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.is_deleted == False,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Verify page ownership if task belongs to a page
    if task.page_id:
        require_page_role(db, user, task.page_id, "viewer")
    return task


# ── List tasks for a page ──────────────────────────────
@router.get("/pages/{page_id}/tasks", response_model=List[schemas.TaskWithSubtasks])
def list_tasks(
    page_id: str,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "viewer")

    q = db.query(models.Task).filter(
        models.Task.page_id == page_id,
        models.Task.parent_task_id == None,
        models.Task.is_deleted == False,
    )
    if status:
        q = q.filter(models.Task.status == status)
    if priority:
        q = q.filter(models.Task.priority == priority)
    if assignee_id:
        q = q.filter(models.Task.assignee_id == assignee_id)

    return q.order_by(models.Task.order).all()


# ── List ALL tasks across user's pages (for dashboard) ─
@router.get("/tasks", response_model=List[schemas.TaskWithSubtasks])
def list_all_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    effective_roles = compute_effective_page_roles(db, current_user)
    page_ids = [page_id for page_id, role in effective_roles.items() if role_at_least(role, "viewer")]

    q = db.query(models.Task).filter(
        models.Task.page_id.in_(page_ids),
        models.Task.parent_task_id == None,
        models.Task.is_deleted == False,
    )
    if status:
        q = q.filter(models.Task.status == status)
    if priority:
        q = q.filter(models.Task.priority == priority)

    return q.order_by(models.Task.due_date.asc().nullslast()).all()


# ── Create task ────────────────────────────────────────
@router.post("/pages/{page_id}/tasks", response_model=schemas.TaskOut)
def create_task(
    page_id: str,
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "editor")

    # Determine order
    sibling_count = db.query(models.Task).filter(
        models.Task.page_id == page_id,
        models.Task.parent_task_id == task_in.parent_task_id,
        models.Task.is_deleted == False,
    ).count()

    task = models.Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        due_date=task_in.due_date,
        page_id=page_id,
        assignee_id=task_in.assignee_id,
        parent_task_id=task_in.parent_task_id,
        order=task_in.order or sibling_count,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    _notify_task_created(db, task, current_user)
    db.commit()
    return task


# ── Get single task ────────────────────────────────────
@router.get("/tasks/{task_id}", response_model=schemas.TaskWithSubtasks)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_task_or_404(task_id, current_user.id, db)


# ── Update task ────────────────────────────────────────
@router.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: str,
    task_in: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, current_user.id, db)
    if task.page_id:
        require_page_role(db, current_user, task.page_id, "editor")

    previous = {
        "status": task.status,
        "due_date": task.due_date,
        "assignee_id": task.assignee_id,
    }

    for field, value in task_in.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    _notify_task_updated(db, task, current_user, previous)
    db.commit()
    return task


# ── Delete task (soft) ─────────────────────────────────
@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, current_user.id, db)
    if task.page_id:
        require_page_role(db, current_user, task.page_id, "editor")
    task.is_deleted = True
    task.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


# ── Reorder tasks ──────────────────────────────────────
@router.put("/pages/{page_id}/tasks/reorder")
def reorder_tasks(
    page_id: str,
    task_ids: List[str],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "editor")
    tasks = db.query(models.Task).filter(models.Task.page_id == page_id).all()
    task_map = {t.id: t for t in tasks}
    for idx, tid in enumerate(task_ids):
        if tid in task_map:
            task_map[tid].order = idx
    db.commit()
    return {"ok": True}
