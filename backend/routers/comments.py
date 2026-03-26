from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from auth import get_current_user
import models, re

router = APIRouter(prefix="/comments", tags=["comments"])


class CommentCreate(BaseModel):
    body: str
    page_id: Optional[str] = None
    task_id: Optional[str] = None


class CommentUpdate(BaseModel):
    body: str


class CommentAuthor(BaseModel):
    id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class CommentOut(BaseModel):
    id: str
    body: str
    author_id: str
    author: CommentAuthor
    page_id: Optional[str]
    task_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _extract_mentions(body: str):
    """Extract @username mentions from comment body."""
    return re.findall(r'@(\w+)', body)


def _create_mention_notifications(body: str, actor: models.User, link: str, db: Session):
    """Create notifications for @mentioned users."""
    mentions = _extract_mentions(body)
    for name in mentions:
        user = db.query(models.User).filter(
            (models.User.name == name) | (models.User.email.like(f"{name}%"))
        ).first()
        if user and user.id != actor.id:
            notif = models.Notification(
                user_id=user.id,
                type="mention",
                body=f"{actor.name or actor.email} mentioned you in a comment",
                link=link,
            )
            db.add(notif)


@router.get("/pages/{page_id}", response_model=List[CommentOut])
def get_page_comments(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Comment).filter(
        models.Comment.page_id == page_id,
        models.Comment.is_deleted == False,
    ).order_by(models.Comment.created_at).all()


@router.get("/tasks/{task_id}", response_model=List[CommentOut])
def get_task_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Comment).filter(
        models.Comment.task_id == task_id,
        models.Comment.is_deleted == False,
    ).order_by(models.Comment.created_at).all()


@router.post("", response_model=CommentOut)
def create_comment(
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    comment = models.Comment(
        body=comment_in.body,
        author_id=current_user.id,
        page_id=comment_in.page_id,
        task_id=comment_in.task_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Log activity
    entity_id = comment_in.page_id or comment_in.task_id or ""
    link = f"/page/{comment_in.page_id}" if comment_in.page_id else ""
    log = models.ActivityLog(
        actor_id=current_user.id,
        entity_type="comment",
        entity_id=entity_id,
        entity_title=comment_in.body[:60],
        action="created",
    )
    db.add(log)

    # Mention notifications
    _create_mention_notifications(comment_in.body, current_user, link, db)
    db.commit()
    db.refresh(comment)
    return comment


@router.put("/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: str,
    comment_in: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.author_id == current_user.id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.body = comment_in.body
    comment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.author_id == current_user.id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.is_deleted = True
    db.commit()
    return {"ok": True}
