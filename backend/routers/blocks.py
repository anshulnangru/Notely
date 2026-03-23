from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
import models, schemas
from datetime import datetime

router = APIRouter(tags=["blocks"])


def _get_page_or_404(page_id: str, user_id: str, db: Session) -> models.Page:
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.owner_id == user_id,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.post("/pages/{page_id}/blocks", response_model=schemas.BlockOut)
def create_block(
    page_id: str,
    block_in: schemas.BlockCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_page_or_404(page_id, current_user.id, db)

    block = models.Block(
        page_id=page_id,
        type=block_in.type,
        content=block_in.content,
        checked=block_in.checked,
        order=block_in.order,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.put("/blocks/{block_id}", response_model=schemas.BlockOut)
def update_block(
    block_id: str,
    block_in: schemas.BlockUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    _get_page_or_404(block.page_id, current_user.id, db)

    if block_in.type is not None:
        block.type = block_in.type
    if block_in.content is not None:
        block.content = block_in.content
    if block_in.checked is not None:
        block.checked = block_in.checked
    if block_in.order is not None:
        block.order = block_in.order

    block.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(block)
    return block


@router.delete("/blocks/{block_id}")
def delete_block(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    block = db.query(models.Block).filter(models.Block.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    _get_page_or_404(block.page_id, current_user.id, db)
    db.delete(block)
    db.commit()
    return {"ok": True}


@router.put("/pages/{page_id}/blocks/reorder", response_model=List[schemas.BlockOut])
def reorder_blocks(
    page_id: str,
    reorder_in: schemas.BlockReorder,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_page_or_404(page_id, current_user.id, db)

    blocks = db.query(models.Block).filter(models.Block.page_id == page_id).all()
    block_map = {b.id: b for b in blocks}

    for idx, block_id in enumerate(reorder_in.block_ids):
        if block_id in block_map:
            block_map[block_id].order = idx

    db.commit()
    return sorted(blocks, key=lambda b: b.order)
