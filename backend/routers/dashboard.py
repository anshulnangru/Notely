from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)

    # All pages owned
    page_ids = [p.id for p in db.query(models.Page).filter(
        models.Page.owner_id == current_user.id,
        models.Page.is_deleted == False,
    ).all()]

    all_tasks = db.query(models.Task).filter(
        models.Task.page_id.in_(page_ids),
        models.Task.is_deleted == False,
        models.Task.parent_task_id == None,
    ).all()

    def task_out(t):
        return {
            "id": t.id, "title": t.title, "status": t.status,
            "priority": t.priority, "due_date": t.due_date.isoformat() if t.due_date else None,
            "page_id": t.page_id,
        }

    # Stats
    total = len(all_tasks)
    done_count = sum(1 for t in all_tasks if t.status == "done")
    todo_count = sum(1 for t in all_tasks if t.status == "todo")
    in_progress_count = sum(1 for t in all_tasks if t.status == "in_progress")

    today_tasks = [task_out(t) for t in all_tasks
                   if t.due_date and today_start <= t.due_date < today_end]

    overdue_tasks = [task_out(t) for t in all_tasks
                     if t.due_date and t.due_date < today_start and t.status != "done"]

    upcoming_tasks = [task_out(t) for t in all_tasks
                      if t.due_date and today_end <= t.due_date < week_end and t.status != "done"]

    # Recent pages
    recent_pages = db.query(models.Page).filter(
        models.Page.owner_id == current_user.id,
        models.Page.is_deleted == False,
    ).order_by(models.Page.updated_at.desc()).limit(8).all()

    return {
        "stats": {
            "total": total,
            "done": done_count,
            "todo": todo_count,
            "in_progress": in_progress_count,
            "progress_pct": round(done_count / total * 100) if total else 0,
        },
        "today_tasks": today_tasks,
        "overdue_tasks": overdue_tasks,
        "upcoming_tasks": upcoming_tasks,
        "recent_pages": [
            {"id": p.id, "title": p.title, "emoji": p.emoji,
             "updated_at": p.updated_at.isoformat()}
            for p in recent_pages
        ],
    }
