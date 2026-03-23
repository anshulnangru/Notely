import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime,
    ForeignKey, Text
)
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    pages = relationship("Page", back_populates="owner", cascade="all, delete-orphan")


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


class Block(Base):
    __tablename__ = "blocks"

    id = Column(String, primary_key=True, default=generate_uuid)
    page_id = Column(String, ForeignKey("pages.id"), nullable=False)
    type = Column(String, default="text")  # text, h1, h2, h3, todo, bullet, numbered, toggle, divider, image, quote, code
    content = Column(Text, default="")
    checked = Column(Boolean, default=False)   # for todo blocks
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    page = relationship("Page", back_populates="blocks")
