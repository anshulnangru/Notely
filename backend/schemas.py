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
