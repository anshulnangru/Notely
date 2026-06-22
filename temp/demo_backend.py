"""
demo_backend.py

Documentation appendix file containing curated core backend code from Notely.
This file is intentionally assembled from the most important backend modules so it
can be attached as a Python appendix in project documentation.
"""

# ============================================================================
# backend/main.py
# ============================================================================

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text
from database import engine, Base
import models  # ensure tables are registered
from routers import auth, pages, blocks, tasks, tags, dashboard, comments, notifications, uploads, activity, collaboration, inbox
from scheduler import send_due_soon_notifications, start_scheduler
import os
import logging
import time
import traceback

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("notely")

logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

Base.metadata.create_all(bind=engine)


def ensure_runtime_schema():
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_verification_token ON users (email_verification_token)",
    ]
    try:
        with engine.begin() as conn:
            for statement in statements:
                conn.execute(text(statement))
    except Exception:
        log.warning("Could not apply runtime schema updates", exc_info=True)


ensure_runtime_schema()

_scheduler_stop = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_stop
    log.info("Notely API starting up")
    send_due_soon_notifications()
    _scheduler_stop = start_scheduler(interval_seconds=60)
    yield
    log.info("Notely API shutting down")
    if _scheduler_stop:
        _scheduler_stop.set()


app = FastAPI(title="Notely API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    log.info(f"-> {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        log.log(level, f"<- {request.method} {request.url.path} [{response.status_code}] {elapsed:.1f}ms")
        return response
    except Exception as exc:
        elapsed = (time.perf_counter() - start) * 1000
        log.error(
            f"UNHANDLED {request.method} {request.url.path} ({elapsed:.1f}ms)\n"
            + traceback.format_exc()
        )
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"},
        )


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(pages.router)
app.include_router(blocks.router)
app.include_router(tasks.router)
app.include_router(tags.router)
app.include_router(dashboard.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(inbox.router)
app.include_router(uploads.router)
app.include_router(activity.router)
app.include_router(collaboration.router)


@app.get("/")
def root():
    return {"message": "Notely API v2 - visit /docs for Swagger UI"}


# ============================================================================
# backend/models.py
# ============================================================================

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime,
    ForeignKey, Text, Table
)
import enum
from sqlalchemy.orm import relationship
from database import Base

task_tags = Table(
    "task_tags", Base.metadata,
    Column("task_id", String, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

page_tags = Table(
    "page_tags", Base.metadata,
    Column("page_id", String, ForeignKey("pages.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False, default="")
    is_email_verified = Column(Boolean, default=False, nullable=False)
    email_verification_token = Column(String, nullable=True, unique=True)
    email_verification_sent_at = Column(DateTime, nullable=True)
    email_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    pages = relationship("Page", back_populates="owner", cascade="all, delete-orphan")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assignee_id")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="actor", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = "pages"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, default="Untitled")
    emoji = Column(String, default="📄")
    cover_url = Column(String, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    parent_id = Column(String, ForeignKey("pages.id"), nullable=True)
    order = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="pages")
    parent = relationship("Page", remote_side=[id], back_populates="children")
    children = relationship(
        "Page",
        back_populates="parent",
        foreign_keys=[parent_id],
        cascade="all, delete-orphan",
    )
    blocks = relationship("Block", back_populates="page", cascade="all, delete-orphan", order_by="Block.order")
    tasks = relationship("Task", back_populates="page", cascade="all, delete-orphan", order_by="Task.order")
    tags = relationship("Tag", secondary=page_tags, back_populates="pages")
    comments = relationship("Comment", back_populates="page", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="page", cascade="all, delete-orphan")
    permissions = relationship("PagePermission", back_populates="page", cascade="all, delete-orphan")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(String, primary_key=True, default=generate_uuid)
    page_id = Column(String, ForeignKey("pages.id"), nullable=False)
    type = Column(String, default="text")
    content = Column(Text, default="")
    checked = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    page = relationship("Page", back_populates="blocks")


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, default="Untitled task")
    description = Column(Text, default="")
    status = Column(String, default=TaskStatus.todo)
    priority = Column(String, default=TaskPriority.medium)
    due_date = Column(DateTime, nullable=True)
    page_id = Column(String, ForeignKey("pages.id"), nullable=True)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    parent_task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    order = Column(Integer, default=0)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    page = relationship("Page", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks")
    subtasks = relationship("Task", back_populates="parent_task", foreign_keys=[parent_task_id], cascade="all, delete-orphan")
    parent_task = relationship("Task", remote_side=[id], back_populates="subtasks")
    tags = relationship("Tag", secondary=task_tags, back_populates="tasks")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="task", cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    color = Column(String, default="#7c6af7")
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", secondary=task_tags, back_populates="tags")
    pages = relationship("Page", secondary=page_tags, back_populates="tags")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=generate_uuid)
    body = Column(Text, nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    page_id = Column(String, ForeignKey("pages.id"), nullable=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="comments")
    page = relationship("Page", back_populates="comments")
    task = relationship("Task", back_populates="comments")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, default="info")
    body = Column(String, nullable=False)
    link = Column(String, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    entity_title = Column(String, nullable=True)
    action = Column(String, nullable=False)
    detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User", back_populates="activity_logs")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    url = Column(String, nullable=False)
    mimetype = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    page_id = Column(String, ForeignKey("pages.id"), nullable=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=True)
    uploader_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    page = relationship("Page", back_populates="attachments")
    task = relationship("Task", back_populates="attachments")


class PagePermission(Base):
    __tablename__ = "page_permissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    subject_type = Column(String, nullable=False, default="user")
    subject_id = Column(String, nullable=False)
    resource_type = Column(String, nullable=False, default="page")
    resource_id = Column(String, ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False, default="viewer")
    inherited_from_permission_id = Column(String, ForeignKey("page_permissions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    page = relationship("Page", back_populates="permissions")
    inherited_from_permission = relationship("PagePermission", remote_side=[id])


class PageInvite(Base):
    __tablename__ = "page_invites"

    id = Column(String, primary_key=True, default=generate_uuid)
    page_id = Column(String, ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False, default="viewer")
    invited_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================================
# backend/routers/auth.py
# ============================================================================

import logging
from datetime import datetime
import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from services.emailer import send_email
import models, schemas, auth as auth_utils

log = logging.getLogger("notely.auth")
router = APIRouter(prefix="/auth", tags=["auth"])
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")


def _apply_pending_page_invites(user: models.User, db: Session):
    pending_invites = db.query(models.PageInvite).filter(
        models.PageInvite.email == user.email,
        models.PageInvite.accepted_at == None,
    ).all()

    for invite in pending_invites:
        existing_permission = db.query(models.PagePermission).filter(
            models.PagePermission.subject_type == "user",
            models.PagePermission.subject_id == user.id,
            models.PagePermission.resource_type == "page",
            models.PagePermission.resource_id == invite.page_id,
        ).first()
        if existing_permission:
            existing_permission.role = invite.role
        else:
            db.add(models.PagePermission(
                subject_type="user",
                subject_id=user.id,
                resource_type="page",
                resource_id=invite.page_id,
                role=invite.role,
            ))
        invite.accepted_at = datetime.utcnow()


def _build_verification_email(user: models.User) -> tuple[str, str]:
    verify_link = f"{APP_BASE_URL}/verify-email?token={user.email_verification_token}"
    subject = "Verify your Notely email"
    body = (
        f"Hi {user.name or user.email},\n\n"
        "Please verify your email address to activate your Notely account.\n\n"
        f"Verify email: {verify_link}\n\n"
        "If you did not create this account, you can ignore this email.\n"
    )
    return subject, body


@router.post("/register", response_model=schemas.RegisterResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    log.info(f"Register attempt - email={user_in.email!r}")

    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        log.warning(f"Register blocked - email already registered: {user_in.email!r}")
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user = models.User(
            email=user_in.email,
            hashed_password=auth_utils.hash_password(user_in.password),
            name=user_in.name or user_in.email.split("@")[0],
            email_verification_token=secrets.token_urlsafe(32),
            email_verification_sent_at=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        _apply_pending_page_invites(user, db)
        db.commit()
    except Exception as exc:
        db.rollback()
        log.error(f"Register DB error for {user_in.email!r}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not create account: {str(exc)}")

    subject, body = _build_verification_email(user)
    email_sent, email_error = send_email(to_email=user.email, subject=subject, text_body=body)
    message = (
        "Account created. Check your inbox to verify your email before logging in."
        if email_sent
        else f"Account created, but verification email was not sent. {email_error or 'SMTP is not configured.'}"
    )
    return schemas.RegisterResponse(
        user=schemas.UserOut.model_validate(user),
        email_verification_required=True,
        email_sent=email_sent,
        email_error=email_error,
        message=message,
    )


@router.post("/login", response_model=schemas.Token)
def login(login_req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_req.email).first()
    if not user or not auth_utils.verify_password(login_req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, token_type="bearer", user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user


@router.get("/verify-email", response_model=schemas.VerifyEmailResponse)
def verify_email(token: str = Query(..., min_length=8), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email_verification_token == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid or expired verification link")
    if user.is_email_verified:
        return schemas.VerifyEmailResponse(message="Email already verified. You can log in now.")

    user.is_email_verified = True
    user.email_verified_at = datetime.utcnow()
    user.email_verification_token = None
    db.commit()
    return schemas.VerifyEmailResponse(message="Email verified successfully. You can log in now.")


@router.post("/resend-verification", response_model=schemas.VerifyEmailResponse)
def resend_verification_email(email: str = Query(..., min_length=3), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.is_email_verified:
        return schemas.VerifyEmailResponse(message="Email is already verified.")

    user.email_verification_token = secrets.token_urlsafe(32)
    user.email_verification_sent_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    subject, body = _build_verification_email(user)
    email_sent, email_error = send_email(to_email=user.email, subject=subject, text_body=body)
    if not email_sent:
        raise HTTPException(status_code=503, detail=f"Verification email could not be sent: {email_error or 'SMTP is not configured'}")

    return schemas.VerifyEmailResponse(message="Verification email sent. Check your inbox.")


@router.get("/users/search", response_model=List[schemas.UserOut])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user),
):
    query = q.strip()
    users = db.query(models.User).filter(
        (models.User.email.ilike(f"%{query}%")) | (models.User.name.ilike(f"%{query}%"))
    ).order_by(models.User.name.asc(), models.User.email.asc()).limit(10).all()
    return users


# ============================================================================
# backend/routers/pages.py
# ============================================================================

from typing import List, Optional
from datetime import datetime
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from anyio import from_thread
from database import get_db
from auth import get_current_user
from services.emailer import send_email
from services.collaboration.manager import collaboration_manager
from services.permissions import compute_effective_page_roles, require_page_role
import models, schemas

router = APIRouter(prefix="/pages", tags=["pages"])
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")


def _broadcast_page_event(page_id: str, message: dict) -> None:
    try:
        from_thread.run(collaboration_manager.broadcast, page_id, message)
    except Exception:
        pass


def build_tree(pages: List[models.Page], parent_id: Optional[str] = None) -> List[schemas.PageTree]:
    visible_ids = {page.id for page in pages}
    result = []
    for page in sorted([
        p for p in pages
        if (p.parent_id if p.parent_id in visible_ids else None) == parent_id
    ], key=lambda p: p.order):
        node = schemas.PageTree.model_validate(page)
        node.children = build_tree(pages, page.id)
        result.append(node)
    return result


@router.get("", response_model=List[schemas.PageTree])
def list_pages(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    accessible_roles = compute_effective_page_roles(db, current_user)
    if not accessible_roles:
        return []

    pages = db.query(models.Page).filter(
        models.Page.id.in_(list(accessible_roles.keys())),
        models.Page.is_deleted == False,
    ).all()
    return build_tree(pages)


@router.post("", response_model=schemas.PageOut)
def create_page(
    page_in: schemas.PageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if page_in.parent_id:
        require_page_role(db, current_user, page_in.parent_id, "editor")

    siblings = db.query(models.Page).filter(
        models.Page.parent_id == page_in.parent_id,
    ).all()
    order = max((s.order for s in siblings), default=-1) + 1

    page = models.Page(
        title=page_in.title,
        emoji=page_in.emoji,
        cover_url=page_in.cover_url,
        owner_id=current_user.id,
        parent_id=page_in.parent_id,
        order=order,
    )
    db.add(page)
    db.commit()
    db.refresh(page)

    block = models.Block(page_id=page.id, type="text", content="", order=0)
    db.add(block)
    db.commit()
    return page


@router.get("/{page_id}", response_model=schemas.PageWithBlocks)
def get_page(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    page, _ = require_page_role(db, current_user, page_id, "viewer")
    return page


@router.put("/{page_id}", response_model=schemas.PageOut)
def update_page(
    page_id: str,
    page_in: schemas.PageUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    page, _ = require_page_role(db, current_user, page_id, "editor")

    if page_in.title is not None:
        page.title = page_in.title
    if page_in.emoji is not None:
        page.emoji = page_in.emoji
    if page_in.cover_url is not None:
        page.cover_url = page_in.cover_url
    if page_in.is_favorite is not None:
        page.is_favorite = page_in.is_favorite

    page.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(page)
    _broadcast_page_event(page.id, {
        "type": "page.updated",
        "pageId": page.id,
        "payload": {
            "page": schemas.PageOut.model_validate(page).model_dump(mode="json"),
        },
    })
    return page


@router.delete("/{page_id}")
def delete_page(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    page, _ = require_page_role(db, current_user, page_id, "editor")
    page.is_deleted = True
    page.deleted_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


def _serialize_permission(permission: models.PagePermission, db: Session) -> schemas.PagePermissionOut:
    user = None
    if permission.subject_type == "user":
        user = db.query(models.User).filter(models.User.id == permission.subject_id).first()
    return schemas.PagePermissionOut(
        id=permission.id,
        subject_type=permission.subject_type,
        subject_id=permission.subject_id,
        resource_type=permission.resource_type,
        resource_id=permission.resource_id,
        role=permission.role,
        inherited_from_permission_id=permission.inherited_from_permission_id,
        created_at=permission.created_at,
        user=schemas.UserOut.model_validate(user) if user else None,
    )


@router.get("/{page_id}/permissions", response_model=schemas.PagePermissionSummary)
def list_page_permissions(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    page, role = require_page_role(db, current_user, page_id, "viewer")
    explicit_permissions = db.query(models.PagePermission).filter(
        models.PagePermission.resource_id == page.id,
        models.PagePermission.resource_type == "page",
    ).order_by(models.PagePermission.created_at.asc()).all()
    pending_invites = db.query(models.PageInvite).filter(
        models.PageInvite.page_id == page.id,
        models.PageInvite.accepted_at == None,
    ).order_by(models.PageInvite.created_at.desc()).all()

    inherited = []
    ancestor_id = page.parent_id
    while ancestor_id:
        ancestor = db.query(models.Page).filter(models.Page.id == ancestor_id).first()
        if not ancestor:
            break
        inherited.extend(
            db.query(models.PagePermission).filter(
                models.PagePermission.resource_id == ancestor.id,
                models.PagePermission.resource_type == "page",
            ).all()
        )
        ancestor_id = ancestor.parent_id

    inherited_permissions = []
    for permission in inherited:
        inherited_permissions.append(
            schemas.PagePermissionOut(
                id=permission.id,
                subject_type=permission.subject_type,
                subject_id=permission.subject_id,
                resource_type=permission.resource_type,
                resource_id=page.id,
                role=permission.role,
                inherited_from_permission_id=permission.id,
                created_at=permission.created_at,
                user=schemas.UserOut.model_validate(
                    db.query(models.User).filter(models.User.id == permission.subject_id).first()
                ) if permission.subject_type == "user" else None,
            )
        )

    explicit_serialized = [_serialize_permission(permission, db) for permission in explicit_permissions]
    return schemas.PagePermissionSummary(
        current_user_role=role,
        permissions=explicit_serialized + inherited_permissions,
        pending_invites=[schemas.PageInviteOut.model_validate(invite) for invite in pending_invites],
    )


@router.post("/{page_id}/permissions", response_model=schemas.SharePageResult)
def create_page_permission(
    page_id: str,
    permission_in: schemas.PagePermissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _, role = require_page_role(db, current_user, page_id, "owner")
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the page owner can manage sharing")

    if permission_in.role not in {"viewer", "commenter", "editor"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    target_user = None
    if permission_in.user_id:
        target_user = db.query(models.User).filter(models.User.id == permission_in.user_id).first()
    elif permission_in.email:
        target_user = db.query(models.User).filter(models.User.email == permission_in.email).first()
    else:
        raise HTTPException(status_code=400, detail="Provide user_id or email")

    page = db.query(models.Page).filter(models.Page.id == page_id).first()
    invite_email = permission_in.email or target_user.email
    email_sent = False
    email_error = None

    if target_user:
        if page.owner_id == target_user.id:
            raise HTTPException(status_code=400, detail="Page owner already has access")

        permission = db.query(models.PagePermission).filter(
            models.PagePermission.subject_type == "user",
            models.PagePermission.subject_id == target_user.id,
            models.PagePermission.resource_type == "page",
            models.PagePermission.resource_id == page_id,
        ).first()
        if permission:
            permission.role = permission_in.role
        else:
            permission = models.PagePermission(
                subject_type="user",
                subject_id=target_user.id,
                resource_type="page",
                resource_id=page_id,
                role=permission_in.role,
            )
            db.add(permission)

        db.add(models.Notification(
            user_id=target_user.id,
            type="share_invite",
            body=f"{current_user.name or current_user.email} shared '{page.title}' with you as {permission_in.role}",
            link=f"/page/{page_id}",
        ))
        db.commit()
        db.refresh(permission)

        email_sent, email_error = send_email(
            to_email=invite_email,
            subject=f"You were invited to collaborate on {page.title}",
            text_body=(
                f"{current_user.name or current_user.email} shared the page '{page.title}' with you as {permission_in.role}.\n\n"
                f"Open it here: {APP_BASE_URL}/page/{page_id}\n"
            ),
        )

        return schemas.SharePageResult(
            permission=_serialize_permission(permission, db),
            access_granted=True,
            email_sent=email_sent,
            email_error=email_error,
        )

    invite = models.PageInvite(
        page_id=page_id,
        email=invite_email,
        role=permission_in.role,
        invited_by_user_id=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    email_sent, email_error = send_email(
        to_email=invite_email,
        subject=f"You were invited to collaborate on {page.title}",
        text_body=(
            f"{current_user.name or current_user.email} invited you to collaborate on the page '{page.title}' as {permission_in.role}.\n\n"
            "Create an account with this email address, then sign in to access the shared page.\n"
            f"Register here: {APP_BASE_URL}/register\n"
        ),
    )

    return schemas.SharePageResult(
        invite=schemas.PageInviteOut.model_validate(invite),
        access_granted=False,
        email_sent=email_sent,
        email_error=email_error,
    )


# ============================================================================
# backend/routers/tasks.py
# ============================================================================

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
    if task.page_id:
        require_page_role(db, user, task.page_id, "viewer")
    return task


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


@router.post("/pages/{page_id}/tasks", response_model=schemas.TaskOut)
def create_task(
    page_id: str,
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "editor")

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


# ============================================================================
# backend/routers/comments.py
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from auth import get_current_user
from services.permissions import require_page_role
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
    return re.findall(r'@(\w+)', body)


def _create_mention_notifications(body: str, actor: models.User, link: str, db: Session):
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
    require_page_role(db, current_user, page_id, "viewer")
    return db.query(models.Comment).filter(
        models.Comment.page_id == page_id,
        models.Comment.is_deleted == False,
    ).order_by(models.Comment.created_at).all()


@router.post("", response_model=CommentOut)
def create_comment(
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if bool(comment_in.page_id) == bool(comment_in.task_id):
        raise HTTPException(status_code=400, detail="Provide either page_id or task_id")

    if comment_in.page_id:
        require_page_role(db, current_user, comment_in.page_id, "commenter")
    if comment_in.task_id:
        task = db.query(models.Task).filter(
            models.Task.id == comment_in.task_id,
            models.Task.is_deleted == False,
        ).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.page_id:
            require_page_role(db, current_user, task.page_id, "commenter")

    comment = models.Comment(
        body=comment_in.body,
        author_id=current_user.id,
        page_id=comment_in.page_id,
        task_id=comment_in.task_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

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

    _create_mention_notifications(comment_in.body, current_user, link, db)
    db.commit()
    db.refresh(comment)
    return comment

