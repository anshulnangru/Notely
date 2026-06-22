from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models

ROLE_RANK = {
    "viewer": 1,
    "commenter": 2,
    "editor": 3,
    "owner": 4,
}


def role_at_least(role: str | None, minimum_role: str) -> bool:
    return ROLE_RANK.get(role or "", 0) >= ROLE_RANK[minimum_role]


def get_all_active_pages(db: Session) -> list[models.Page]:
    return db.query(models.Page).filter(models.Page.is_deleted == False).all()


def get_permission_grants_for_user(db: Session, user_id: str) -> list[models.PagePermission]:
    return db.query(models.PagePermission).filter(
        models.PagePermission.subject_type == "user",
        models.PagePermission.subject_id == user_id,
        models.PagePermission.resource_type == "page",
    ).all()


def _build_page_maps(pages: list[models.Page]) -> tuple[dict[str, models.Page], dict[str | None, list[models.Page]]]:
    page_by_id = {page.id: page for page in pages}
    children_by_parent: dict[str | None, list[models.Page]] = defaultdict(list)
    for page in pages:
        children_by_parent[page.parent_id].append(page)
    return page_by_id, children_by_parent


def _build_explicit_permission_map(grants: list[models.PagePermission]) -> dict[str, str]:
    explicit: dict[str, str] = {}
    for grant in grants:
        current = explicit.get(grant.resource_id)
        if ROLE_RANK.get(grant.role, 0) > ROLE_RANK.get(current or "", 0):
            explicit[grant.resource_id] = grant.role
    return explicit


def compute_effective_page_roles(db: Session, user: models.User) -> dict[str, str]:
    pages = get_all_active_pages(db)
    page_by_id, children_by_parent = _build_page_maps(pages)
    explicit_permissions = _build_explicit_permission_map(get_permission_grants_for_user(db, user.id))
    effective_roles: dict[str, str] = {}

    def walk(page: models.Page, inherited_role: str | None = None):
        role = inherited_role
        if page.owner_id == user.id:
            role = "owner"
        else:
            explicit_role = explicit_permissions.get(page.id)
            if ROLE_RANK.get(explicit_role or "", 0) > ROLE_RANK.get(role or "", 0):
                role = explicit_role

        if role:
            effective_roles[page.id] = role

        for child in children_by_parent.get(page.id, []):
            walk(child, role)

    for root in children_by_parent.get(None, []):
        walk(root, None)

    # Handle orphan pages with missing parent references defensively.
    for page_id, page in page_by_id.items():
        if page.parent_id and page.parent_id not in page_by_id:
            walk(page, None)

    return effective_roles


def get_effective_page_role(db: Session, user: models.User, page_id: str) -> str | None:
    return compute_effective_page_roles(db, user).get(page_id)


def require_page_role(db: Session, user: models.User, page_id: str, minimum_role: str) -> tuple[models.Page, str]:
    page = db.query(models.Page).filter(
        models.Page.id == page_id,
        models.Page.is_deleted == False,
    ).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    role = get_effective_page_role(db, user, page_id)
    if not role_at_least(role, minimum_role):
        raise HTTPException(status_code=403, detail="Not authorized")

    return page, role
