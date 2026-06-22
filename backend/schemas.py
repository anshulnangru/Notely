from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ────────────────────────────────────────────────
# Auth
# ────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    name: str = ""


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    is_email_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterResponse(BaseModel):
    user: UserOut
    email_verification_required: bool = True
    email_sent: bool = False
    email_error: Optional[str] = None
    message: str


class VerifyEmailResponse(BaseModel):
    ok: bool = True
    message: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ForgotPasswordResponse(BaseModel):
    ok: bool = True
    message: str
    email_sent: bool = False
    email_error: Optional[str] = None
    reset_url: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class ResetPasswordResponse(BaseModel):
    ok: bool = True
    message: str


# ────────────────────────────────────────────────
# Blocks
# ────────────────────────────────────────────────

class BlockCreate(BaseModel):
    type: str = "text"
    content: str = ""
    checked: bool = False
    order: int = 0


class BlockUpdate(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    checked: Optional[bool] = None
    order: Optional[int] = None


class BlockOut(BaseModel):
    id: str
    page_id: str
    type: str
    content: str
    checked: bool
    order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BlockReorder(BaseModel):
    block_ids: List[str]


# ────────────────────────────────────────────────
# Pages
# ────────────────────────────────────────────────

class PageCreate(BaseModel):
    title: str = "Untitled"
    emoji: str = "📄"
    parent_id: Optional[str] = None
    cover_url: Optional[str] = None


class PageUpdate(BaseModel):
    title: Optional[str] = None
    emoji: Optional[str] = None
    cover_url: Optional[str] = None
    is_favorite: Optional[bool] = None


class PageMove(BaseModel):
    parent_id: Optional[str] = None
    order: int = 0


class PageOut(BaseModel):
    id: str
    title: str
    emoji: str
    cover_url: Optional[str]
    owner_id: str
    parent_id: Optional[str]
    order: int
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageWithBlocks(PageOut):
    blocks: List[BlockOut] = []

    class Config:
        from_attributes = True


class PageTree(PageOut):
    children: List["PageTree"] = []

    class Config:
        from_attributes = True


PageTree.model_rebuild()


class PagePermissionCreate(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    role: str


class PagePermissionOut(BaseModel):
    id: str
    subject_type: str
    subject_id: str
    resource_type: str
    resource_id: str
    role: str
    inherited_from_permission_id: Optional[str]
    created_at: datetime
    user: Optional[UserOut] = None


class PagePermissionSummary(BaseModel):
    current_user_role: str
    permissions: List[PagePermissionOut]
    pending_invites: List["PageInviteOut"] = []


class PageInviteOut(BaseModel):
    id: str
    page_id: str
    email: str
    role: str
    invited_by_user_id: str
    accepted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class SharePageResult(BaseModel):
    permission: Optional[PagePermissionOut] = None
    invite: Optional[PageInviteOut] = None
    access_granted: bool = False
    email_sent: bool = False
    email_error: Optional[str] = None


PagePermissionSummary.model_rebuild()


# ──────────────────────────────────────────────
# Tasks
# ──────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = "Untitled task"
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    order: int = 0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    order: Optional[int] = None


class TaskAssigneeOut(BaseModel):
    id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class TaskOut(BaseModel):
    id: str
    title: str
    description: str
    status: str
    priority: str
    due_date: Optional[datetime]
    page_id: Optional[str]
    assignee_id: Optional[str]
    assignee: Optional[TaskAssigneeOut] = None
    parent_task_id: Optional[str]
    order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskWithSubtasks(TaskOut):
    subtasks: List["TaskOut"] = []

    class Config:
        from_attributes = True


TaskWithSubtasks.model_rebuild()
