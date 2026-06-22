"""
scheduler.py — background thread that creates in-app task reminder notifications.
Supports reminders for tasks due in 24 hours, 1 hour, 15 minutes, and overdue.
Uses only stdlib threading — no external dependencies.
"""
import threading
from datetime import datetime, timedelta

from database import SessionLocal
import models


REMINDER_WINDOWS = [
    ("task_due_24h", timedelta(hours=24), timedelta(minutes=20), "is due in 24 hours"),
    ("task_due_1h", timedelta(hours=1), timedelta(minutes=10), "is due in 1 hour"),
    ("task_due_15m", timedelta(minutes=15), timedelta(minutes=5), "is due in 15 minutes"),
]


def _recipient_ids_for_task(task: models.Task, page: models.Page) -> set[str]:
    recipients = {page.owner_id}
    if task.assignee_id:
        recipients.add(task.assignee_id)
    return {user_id for user_id in recipients if user_id}


def _notification_exists(db, *, user_id: str, notif_type: str, link: str, task_title: str) -> bool:
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.type == notif_type,
        models.Notification.link == link,
        models.Notification.body.contains(task_title),
    ).first() is not None


def send_due_soon_notifications():
    """
    Scans all non-deleted tasks with due dates and creates reminder notifications
    at key points before and after the due timestamp.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        lookahead = now + timedelta(hours=24, minutes=20)
        overdue_cutoff = now - timedelta(minutes=10)

        tasks = db.query(models.Task).filter(
            models.Task.is_deleted == False,
            models.Task.due_date != None,
            models.Task.status != "done",
            models.Task.due_date >= overdue_cutoff,
            models.Task.due_date <= lookahead,
        ).all()

        for task in tasks:
            if not task.page_id:
                continue

            page = db.query(models.Page).filter(
                models.Page.id == task.page_id,
                models.Page.is_deleted == False,
            ).first()
            if not page:
                continue

            link = f"/page/{task.page_id}"
            recipients = _recipient_ids_for_task(task, page)

            for notif_type, reminder_delta, tolerance, label in REMINDER_WINDOWS:
                trigger_time = task.due_date - reminder_delta
                if abs((now - trigger_time).total_seconds()) > tolerance.total_seconds():
                    continue

                for user_id in recipients:
                    if _notification_exists(db, user_id=user_id, notif_type=notif_type, link=link, task_title=task.title):
                        continue
                    db.add(models.Notification(
                        user_id=user_id,
                        type=notif_type,
                        body=f'⏰ Task "{task.title}" {label}.',
                        link=link,
                        read=False,
                    ))

            if now >= task.due_date and now <= task.due_date + timedelta(minutes=10):
                for user_id in recipients:
                    if _notification_exists(db, user_id=user_id, notif_type="task_overdue", link=link, task_title=task.title):
                        continue
                    db.add(models.Notification(
                        user_id=user_id,
                        type="task_overdue",
                        body=f'⚠️ Task "{task.title}" is overdue now.',
                        link=link,
                        read=False,
                    ))

        db.commit()
    except Exception as e:
        print(f"[scheduler] Error: {e}")
        db.rollback()
    finally:
        db.close()


def _run_loop(interval_seconds: int, stop_event: threading.Event):
    while not stop_event.wait(interval_seconds):
        send_due_soon_notifications()


def start_scheduler(interval_seconds: int = 60) -> threading.Event:
    stop_event = threading.Event()
    t = threading.Thread(
        target=_run_loop,
        args=(interval_seconds, stop_event),
        daemon=True,
    )
    t.start()
    print(f"[scheduler] Started — will check for due tasks every {interval_seconds}s")
    return stop_event
