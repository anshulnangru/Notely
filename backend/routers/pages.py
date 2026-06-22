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
from services.permissions import compute_effective_page_roles, get_effective_page_role, require_page_role, role_at_least
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


@router.get("/trash", response_model=List[schemas.PageOut])
def list_trash(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Trash remains owner-only for now to avoid destructive actions from shared collaborators.
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
    """Soft delete — moves to Trash."""
    page, _ = require_page_role(db, current_user, page_id, "editor")
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
    page, _ = require_page_role(db, current_user, page_id, "editor")
    if move_in.parent_id:
        require_page_role(db, current_user, move_in.parent_id, "editor")

    page.parent_id = move_in.parent_id
    page.order = move_in.order
    db.commit()
    db.refresh(page)
    return page


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

    inherited: list[models.PagePermission] = []
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

    existing_invite = db.query(models.PageInvite).filter(
        models.PageInvite.page_id == page_id,
        models.PageInvite.email == invite_email,
        models.PageInvite.accepted_at == None,
    ).first()
    if existing_invite:
        existing_invite.role = permission_in.role
        invite = existing_invite
    else:
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


@router.delete("/{page_id}/permissions/{permission_id}")
def delete_page_permission(
    page_id: str,
    permission_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _, role = require_page_role(db, current_user, page_id, "owner")
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the page owner can manage sharing")

    permission = db.query(models.PagePermission).filter(
        models.PagePermission.id == permission_id,
        models.PagePermission.resource_id == page_id,
        models.PagePermission.resource_type == "page",
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    db.delete(permission)
    db.commit()
    return {"ok": True}


@router.patch("/{page_id}/permissions/{permission_id}", response_model=schemas.PagePermissionOut)
def update_page_permission(
    page_id: str,
    permission_id: str,
    permission_in: schemas.PagePermissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _, role = require_page_role(db, current_user, page_id, "owner")
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the page owner can manage sharing")
    if permission_in.role not in {"viewer", "commenter", "editor"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    permission = db.query(models.PagePermission).filter(
        models.PagePermission.id == permission_id,
        models.PagePermission.resource_id == page_id,
        models.PagePermission.resource_type == "page",
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")

    permission.role = permission_in.role
    db.commit()
    db.refresh(permission)
    return _serialize_permission(permission, db)


@router.patch("/{page_id}/invites/{invite_id}", response_model=schemas.PageInviteOut)
def update_page_invite(
    page_id: str,
    invite_id: str,
    permission_in: schemas.PagePermissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _, role = require_page_role(db, current_user, page_id, "owner")
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the page owner can manage sharing")
    if permission_in.role not in {"viewer", "commenter", "editor"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    invite = db.query(models.PageInvite).filter(
        models.PageInvite.id == invite_id,
        models.PageInvite.page_id == page_id,
        models.PageInvite.accepted_at == None,
    ).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    invite.role = permission_in.role
    db.commit()
    db.refresh(invite)
    return schemas.PageInviteOut.model_validate(invite)
