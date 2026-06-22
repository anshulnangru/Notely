from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from anyio import from_thread
from database import get_db
from auth import get_current_user
from services.permissions import require_page_role
from services.collaboration.manager import collaboration_manager
import models, schemas
from datetime import datetime

router = APIRouter(tags=["blocks"])


def _broadcast_page_event(page_id: str, message: dict) -> None:
    try:
        from_thread.run(collaboration_manager.broadcast, page_id, message)
    except Exception:
        pass


def _get_page_or_404(page_id: str, user_id: str, db: Session) -> models.Page:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    page, _ = require_page_role(db, user, page_id, "viewer")
    return page


@router.post("/pages/{page_id}/blocks", response_model=schemas.BlockOut)
def create_block(
    page_id: str,
    block_in: schemas.BlockCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "editor")

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
    _broadcast_page_event(page_id, {
        "type": "block.created",
        "pageId": page_id,
        "payload": {
            "pageId": page_id,
            "block": schemas.BlockOut.model_validate(block).model_dump(mode="json"),
        },
    })
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
    require_page_role(db, current_user, block.page_id, "editor")

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
    _broadcast_page_event(block.page_id, {
        "type": "block.updated",
        "pageId": block.page_id,
        "payload": {
            "pageId": block.page_id,
            "block": schemas.BlockOut.model_validate(block).model_dump(mode="json"),
        },
    })
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
    require_page_role(db, current_user, block.page_id, "editor")
    page_id = block.page_id
    db.delete(block)
    db.commit()
    _broadcast_page_event(page_id, {
        "type": "block.deleted",
        "pageId": page_id,
        "payload": {
            "pageId": page_id,
            "blockId": block_id,
        },
    })
    return {"ok": True}


@router.put("/pages/{page_id}/blocks/reorder", response_model=List[schemas.BlockOut])
def reorder_blocks(
    page_id: str,
    reorder_in: schemas.BlockReorder,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_page_role(db, current_user, page_id, "editor")

    blocks = db.query(models.Block).filter(models.Block.page_id == page_id).all()
    block_map = {b.id: b for b in blocks}

    for idx, block_id in enumerate(reorder_in.block_ids):
        if block_id in block_map:
            block_map[block_id].order = idx

    db.commit()
    ordered_blocks = sorted(blocks, key=lambda b: b.order)
    _broadcast_page_event(page_id, {
        "type": "blocks.reordered",
        "pageId": page_id,
        "payload": {
            "pageId": page_id,
            "blocks": [schemas.BlockOut.model_validate(block).model_dump(mode="json") for block in ordered_blocks],
        },
    })
    return ordered_blocks
