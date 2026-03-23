from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/pages", tags=["pages"])


def build_tree(pages: List[models.Page], parent_id: Optional[str] = None) -> List[schemas.PageTree]:
    result = []
    for page in sorted([p for p in pages if p.parent_id == parent_id], key=lambda p: p.order):
        node = schemas.PageTree.model_validate(page)
        node.children = build_tree(pages, page.id)
        result.append(node)
    return result


@router.get("", response_model=List[schemas.PageTree])
def list_pages(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    pages = db.query(models.Page).filter(
        models.Page.owner_id == current_user.id,
        models.Page.is_deleted == False,
    ).all()
    return build_tree(pages)


@router.get("/trash", response_model=List[schemas.PageOut])
def list_trash(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    pages = db.query(models.Page).filter(
        models.Page.owner_id == current_user.id,
        models.Page.is_deleted == True,
    ).order_by(models.Page.deleted_at.desc()).all()
    return pages


@router.post("", response_model=schemas.PageOut)
def create_page(
    page_in: schemas.PageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    siblings = db.query(models.Page).filter(
        models.Page.owner_id == current_user.id,
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
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.put("/{page_id}", response_model=schemas.PageOut)
def update_page(
    page_id: str,
    page_in: schemas.PageUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

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
    return page


@router.delete("/{page_id}")
def delete_page(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Soft delete — moves to Trash."""
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    page.is_deleted = True
    page.deleted_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/{page_id}/restore", response_model=schemas.PageOut)
def restore_page(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Restore from Trash."""
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
        models.Page.is_deleted == True,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found in trash")
    page.is_deleted = False
    page.deleted_at = None
    db.commit()
    db.refresh(page)
    return page


@router.delete("/{page_id}/permanent")
def permanently_delete_page(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Permanently delete (cannot be undone)."""
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    db.delete(page)
    db.commit()
    return {"ok": True}


@router.put("/{page_id}/move", response_model=schemas.PageOut)
def move_page(
    page_id: str,
    move_in: schemas.PageMove,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == current_user.id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    page.parent_id = move_in.parent_id
    page.order = move_in.order
    db.commit()
    db.refresh(page)
    return page
