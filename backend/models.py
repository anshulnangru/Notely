import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime,
    ForeignKey, Text, Enum, Table
)
import enum
from sqlalchemy.orm import relationship
from database import Base

# ── Association tables ──────────────────────────────────
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
    password_reset_token = Column(String, nullable=True, unique=True)
    password_reset_expires_at = Column(DateTime, nullable=True)
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


# ── Task enums ──────────────────────────────────────────
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
    subtasks = relationship("Task", back_populates="parent_task",
                            foreign_keys=[parent_task_id],
                            cascade="all, delete-orphan")
    parent_task = relationship("Task", remote_side=[id], back_populates="subtasks")
    tags = relationship("Tag", secondary=task_tags, back_populates="tasks")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="task", cascade="all, delete-orphan")


# ── Tag ──────────────────────────────────────────────────
class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    color = Column(String, default="#7c6af7")
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", secondary=task_tags, back_populates="tags")
    pages = relationship("Page", secondary=page_tags, back_populates="tags")


# ── Comment ──────────────────────────────────────────────
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


# ── Notification ─────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, default="info")   # mention | comment | task_assigned | due_soon
    body = Column(String, nullable=False)
    link = Column(String, nullable=True)    # e.g. /page/{id}
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


# ── ActivityLog ──────────────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)
    entity_type = Column(String, nullable=False)   # page | task | comment
    entity_id = Column(String, nullable=False)
    entity_title = Column(String, nullable=True)
    action = Column(String, nullable=False)        # created | updated | deleted | completed
    detail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User", back_populates="activity_logs")


# ── Attachment ───────────────────────────────────────────
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
    subject_type = Column(String, nullable=False, default="user")   # user | team | public_link
    subject_id = Column(String, nullable=False)
    resource_type = Column(String, nullable=False, default="page")  # page | workspace
    resource_id = Column(String, ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False, default="viewer")         # owner | editor | commenter | viewer
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
