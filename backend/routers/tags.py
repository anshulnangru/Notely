from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth import get_current_user
from services.permissions import compute_effective_page_roles, require_page_role, role_at_least
import models

router = APIRouter(prefix="/tags", tags=["tags"])


# ── Schemas (inline for simplicity) ──────────────────
class TagCreate(BaseModel):
    name: str
    color: str = "#7c6af7"


class TagOut(BaseModel):
    id: str
    name: str
    color: str
    owner_id: str

    class Config:
        from_attributes = True


# ── CRUD ──────────────────────────────────────────────
@router.get("", response_model=List[TagOut])
def list_tags(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Tag).filter(models.Tag.owner_id == current_user.id).all()


@router.post("", response_model=TagOut)
def create_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tag = models.Tag(name=tag_in.name, color=tag_in.color, owner_id=current_user.id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def delete_tag(
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tag = db.query(models.Tag).filter(
        models.Tag.id == tag_id,
        models.Tag.owner_id == current_user.id,
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return {"ok": True}


# ── Task tag assignment ───────────────────────────────
@router.post("/tasks/{task_id}/tags/{tag_id}")
def add_tag_to_task(
    task_id: str,
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id, models.Tag.owner_id == current_user.id).first()
    if not task or not tag:
        raise HTTPException(status_code=404, detail="Task or tag not found")
    if task.page_id:
        require_page_role(db, current_user, task.page_id, "editor")
    if tag not in task.tags:
        task.tags.append(tag)
        db.commit()
    return {"ok": True}


@router.delete("/tasks/{task_id}/tags/{tag_id}")
def remove_tag_from_task(
    task_id: str,
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not task or not tag:
        raise HTTPException(status_code=404, detail="Not found")
    if task.page_id:
        require_page_role(db, current_user, task.page_id, "editor")
    if tag in task.tags:
        task.tags.remove(tag)
        db.commit()
    return {"ok": True}


# ── Page tag assignment ───────────────────────────────
@router.post("/pages/{page_id}/tags/{tag_id}")
def add_tag_to_page(
    page_id: str,
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "editor")
    page = db.query(models.Page).filter(models.Page.id == page_id).first()
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id, models.Tag.owner_id == current_user.id).first()
    if not page or not tag:
        raise HTTPException(status_code=404, detail="Page or tag not found")
    if tag not in page.tags:
        page.tags.append(tag)
        db.commit()
    return {"ok": True}


@router.delete("/pages/{page_id}/tags/{tag_id}")
def remove_tag_from_page(
    page_id: str,
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "editor")
    page = db.query(models.Page).filter(models.Page.id == page_id).first()
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if not page or not tag:
        raise HTTPException(status_code=404, detail="Not found")
    if tag in page.tags:
        page.tags.remove(tag)
        db.commit()
    return {"ok": True}


# ── Search (global: pages + tasks) ───────────────────
@router.get("/search")
def global_search(
    q: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Search pages and tasks by title/content."""
    if not q or len(q.strip()) < 1:
        return {"pages": [], "tasks": []}

    term = f"%{q.lower()}%"

    effective_roles = compute_effective_page_roles(db, current_user)
    page_ids = [page_id for page_id, role in effective_roles.items() if role_at_least(role, "viewer")]
    if not page_ids:
        return {"pages": [], "tasks": []}

    pages = db.query(models.Page).filter(
        models.Page.id.in_(page_ids),
        models.Page.is_deleted == False,
        models.Page.title.ilike(term),
    ).limit(20).all()

    tasks = db.query(models.Task).filter(
        models.Task.page_id.in_(page_ids),
        models.Task.is_deleted == False,
        models.Task.title.ilike(term),
    ).limit(20).all()

    return {
        "pages": [{"id": p.id, "title": p.title, "emoji": p.emoji, "type": "page"} for p in pages],
        "tasks": [{"id": t.id, "title": t.title, "status": t.status, "page_id": t.page_id, "type": "task"} for t in tasks],
    }
