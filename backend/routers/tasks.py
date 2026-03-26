from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(tags=["tasks"])


def _get_task_or_404(task_id: str, user_id: str, db: Session) -> models.Task:
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.is_deleted == False,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Verify page ownership if task belongs to a page
    if task.page_id:
        page = db.query(models.Page).filter(
            models.Page.id == task.page_id,
            models.Page.owner_id == user_id,
        ).first()
        if not page:
            raise HTTPException(status_code=403, detail="Not authorized")
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
    # Verify page ownership
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

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
    # Get all page IDs owned by user
    page_ids = [p.id for p in db.query(models.Page).filter(
        models.Page.owner_id == current_user.id,
        models.Page.is_deleted == False,
    ).all()]

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
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

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

    for field, value in task_in.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


# ── Delete task (soft) ─────────────────────────────────
@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = _get_task_or_404(task_id, current_user.id, db)
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
    tasks = db.query(models.Task).filter(models.Task.page_id == page_id).all()
    task_map = {t.id: t for t in tasks}
    for idx, tid in enumerate(task_ids):
        if tid in task_map:
            task_map[tid].order = idx
    db.commit()
    return {"ok": True}
