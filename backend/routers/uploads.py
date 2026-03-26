from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os, shutil, uuid
from database import get_db
from auth import get_current_user
import models

router = APIRouter(tags=["uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class AttachmentOut(BaseModel):
    id: str
    filename: str
    url: str
    mimetype: Optional[str]
    size: Optional[int]
    page_id: Optional[str]
    task_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/upload", response_model=AttachmentOut)
async def upload_file(
    file: UploadFile = File(...),
    page_id: Optional[str] = None,
    task_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Unique filename
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(UPLOAD_DIR, unique_name)

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(dest)
    url = f"/uploads/{unique_name}"

    attachment = models.Attachment(
        filename=file.filename,
        url=url,
        mimetype=file.content_type,
        size=file_size,
        page_id=page_id,
        task_id=task_id,
        uploader_id=current_user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/attachments/pages/{page_id}", response_model=List[AttachmentOut])
def get_page_attachments(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Attachment).filter(
        models.Attachment.page_id == page_id
    ).order_by(models.Attachment.created_at.desc()).all()


@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    att = db.query(models.Attachment).filter(
        models.Attachment.id == attachment_id,
        models.Attachment.uploader_id == current_user.id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Not found")

    # Remove file
    path = os.path.join(UPLOAD_DIR, os.path.basename(att.url))
    if os.path.exists(path):
        os.remove(path)

    db.delete(att)
    db.commit()
    return {"ok": True}
