from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from services.permissions import compute_effective_page_roles, role_at_least
import models

router = APIRouter(prefix="/inbox", tags=["inbox"])


class InboxAuthor(BaseModel):
    id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class InboxNotificationOut(BaseModel):
    id: str
    type: str
    body: str
    link: Optional[str] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InboxMessageOut(BaseModel):
    id: str
    body: str
    created_at: datetime
    page_id: Optional[str] = None
    task_id: Optional[str] = None
    page_title: Optional[str] = None
    task_title: Optional[str] = None
    author: InboxAuthor
    link: Optional[str] = None


class InboxStatsOut(BaseModel):
    unread_notifications: int
    unread_mentions: int
    recent_messages: int
    today_items: int


class InboxResponse(BaseModel):
    notifications: List[InboxNotificationOut]
    messages: List[InboxMessageOut]
    stats: InboxStatsOut


@router.get("", response_model=InboxResponse)
def get_inbox(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    effective_roles = compute_effective_page_roles(db, current_user)
    page_ids = [page_id for page_id, role in effective_roles.items() if role_at_least(role, "viewer")]

    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
    ).order_by(models.Notification.created_at.desc()).limit(40).all()

    unread_notifications = sum(1 for notification in notifications if not notification.read)
    unread_mentions = sum(
        1 for notification in notifications
        if notification.type == "mention" and not notification.read
    )

    page_comments = []
    task_comments = []
    if page_ids:
        page_comments = db.query(models.Comment).filter(
            models.Comment.page_id.in_(page_ids),
            models.Comment.author_id != current_user.id,
            models.Comment.is_deleted == False,
        ).order_by(models.Comment.created_at.desc()).limit(30).all()

        task_comments = db.query(models.Comment).join(
            models.Task, models.Comment.task_id == models.Task.id,
        ).filter(
            models.Task.page_id.in_(page_ids),
            models.Comment.author_id != current_user.id,
            models.Comment.is_deleted == False,
            models.Task.is_deleted == False,
        ).order_by(models.Comment.created_at.desc()).limit(30).all()

    combined_comments = sorted(
        [*page_comments, *task_comments],
        key=lambda comment: comment.created_at,
        reverse=True,
    )

    message_items = []
    seen_ids = set()
    for comment in combined_comments:
        if comment.id in seen_ids:
            continue
        seen_ids.add(comment.id)

        page_title = comment.page.title if comment.page else None
        task_title = comment.task.title if comment.task else None
        page_id = comment.page_id or comment.task.page_id if comment.task else comment.page_id
        link = f"/page/{page_id}" if page_id else None

        message_items.append({
            "id": comment.id,
            "body": comment.body,
            "created_at": comment.created_at,
            "page_id": page_id,
            "task_id": comment.task_id,
            "page_title": page_title or (comment.task.page.title if comment.task and comment.task.page else None),
            "task_title": task_title,
            "author": comment.author,
            "link": link,
        })

        if len(message_items) >= 25:
            break

    recent_cutoff = datetime.utcnow() - timedelta(days=7)
    today_cutoff = datetime.utcnow() - timedelta(days=1)

    stats = {
        "unread_notifications": unread_notifications,
        "unread_mentions": unread_mentions,
        "recent_messages": sum(1 for message in message_items if message["created_at"] >= recent_cutoff),
        "today_items": sum(1 for notification in notifications if notification.created_at >= today_cutoff)
        + sum(1 for message in message_items if message["created_at"] >= today_cutoff),
    }

    return {
        "notifications": notifications,
        "messages": message_items,
        "stats": stats,
    }
