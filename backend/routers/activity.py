from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/activity", tags=["activity"])


class ActivityOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    entity_title: str | None
    action: str
    detail: str | None
    created_at: datetime
    actor: dict

    class Config:
        from_attributes = True


@router.get("", response_model=List[dict])
def get_activity(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    logs = db.query(models.ActivityLog).filter(
        models.ActivityLog.actor_id == current_user.id,
    ).order_by(models.ActivityLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "entity_title": l.entity_title,
            "action": l.action,
            "detail": l.detail,
            "created_at": l.created_at.isoformat(),
            "actor": {"id": current_user.id, "name": current_user.name, "email": current_user.email},
        }
        for l in logs
    ]
