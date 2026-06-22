import logging
from datetime import datetime, timedelta
import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from services.emailer import send_email, email_enabled
import models, schemas, auth as auth_utils

log = logging.getLogger("notely.auth")
router = APIRouter(prefix="/auth", tags=["auth"])
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")


def _verification_required() -> bool:
    return email_enabled()


def _can_expose_dev_reset_link() -> bool:
    return APP_BASE_URL.startswith("http://localhost") or APP_BASE_URL.startswith("http://127.0.0.1")


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


def _build_password_reset_email(user: models.User) -> tuple[str, str, str]:
    reset_link = f"{APP_BASE_URL}/reset-password?token={user.password_reset_token}"
    subject = "Reset your Notely password"
    body = (
        f"Hi {user.name or user.email},\n\n"
        "We received a request to reset your Notely password.\n\n"
        f"Reset password: {reset_link}\n\n"
        "This link expires in 1 hour. If you did not request this, you can ignore this email.\n"
    )
    return subject, body, reset_link


@router.post("/register", response_model=schemas.RegisterResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    log.info(f"Register attempt — email={user_in.email!r}")

    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        log.warning(f"Register blocked — email already registered: {user_in.email!r}")
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        verification_required = _verification_required()
        user = models.User(
            email=user_in.email,
            hashed_password=auth_utils.hash_password(user_in.password),
            name=user_in.name or user_in.email.split("@")[0],
            is_email_verified=not verification_required,
            email_verified_at=None if verification_required else datetime.utcnow(),
            email_verification_token=secrets.token_urlsafe(32) if verification_required else None,
            email_verification_sent_at=datetime.utcnow() if verification_required else None,
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

    log.info(f"Register success — user_id={user.id}, email={user.email!r}")
    email_sent = False
    email_error = None
    if verification_required:
        subject, body = _build_verification_email(user)
        email_sent, email_error = send_email(to_email=user.email, subject=subject, text_body=body)
        message = (
            "Account created. Check your inbox to verify your email before logging in."
            if email_sent
            else f"Account created, but verification email was not sent. {email_error or 'SMTP is not configured.'}"
        )
    else:
        message = "Account created. Email verification is disabled in this environment, so you can log in immediately."
    return schemas.RegisterResponse(
        user=schemas.UserOut.model_validate(user),
        email_verification_required=verification_required,
        email_sent=email_sent,
        email_error=email_error,
        message=message,
    )


@router.post("/login", response_model=schemas.Token)
def login(login_req: schemas.LoginRequest, db: Session = Depends(get_db)):
    log.info(f"Login attempt — email={login_req.email!r}")

    user = db.query(models.User).filter(models.User.email == login_req.email).first()
    if not user or not auth_utils.verify_password(login_req.password, user.hashed_password):
        log.warning(f"Login failed — bad credentials for {login_req.email!r}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if _verification_required() and not user.is_email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    token = auth_utils.create_access_token({"sub": str(user.id)})
    log.info(f"Login success — user_id={user.id}, email={user.email!r}")
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
    if not _verification_required():
        user.is_email_verified = True
        user.email_verified_at = datetime.utcnow()
        user.email_verification_token = None
        user.email_verification_sent_at = None
        db.commit()
        return schemas.VerifyEmailResponse(
            message="Email verification is disabled in this environment. Your account has been activated and you can log in now."
        )

    user.email_verification_token = secrets.token_urlsafe(32)
    user.email_verification_sent_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    subject, body = _build_verification_email(user)
    email_sent, email_error = send_email(to_email=user.email, subject=subject, text_body=body)
    if not email_sent:
        raise HTTPException(status_code=503, detail=f"Verification email could not be sent: {email_error or 'SMTP is not configured'}")

    return schemas.VerifyEmailResponse(message="Verification email sent. Check your inbox.")


@router.post("/forgot-password", response_model=schemas.ForgotPasswordResponse)
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = request.email.strip()
    generic_message = "If an account exists for that email, a password reset link has been sent."
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return schemas.ForgotPasswordResponse(message=generic_message)

    user.password_reset_token = secrets.token_urlsafe(32)
    user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    db.refresh(user)

    subject, body, reset_url = _build_password_reset_email(user)
    email_sent, email_error = send_email(to_email=user.email, subject=subject, text_body=body)
    if email_sent:
        return schemas.ForgotPasswordResponse(
            message="Password reset link sent. Check your inbox.",
            email_sent=True,
        )

    dev_reset_url = reset_url if _can_expose_dev_reset_link() else None
    return schemas.ForgotPasswordResponse(
        message=(
            "Email could not be sent, so use the reset link below to continue."
            if dev_reset_url
            else "Password reset email could not be sent."
        ),
        email_sent=False,
        email_error=email_error,
        reset_url=dev_reset_url,
    )


@router.post("/reset-password", response_model=schemas.ResetPasswordResponse)
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = db.query(models.User).filter(models.User.password_reset_token == request.token).first()
    if (
        not user
        or not user.password_reset_expires_at
        or user.password_reset_expires_at < datetime.utcnow()
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired password reset link")

    user.hashed_password = auth_utils.hash_password(request.password)
    user.password_reset_token = None
    user.password_reset_expires_at = None
    db.commit()
    return schemas.ResetPasswordResponse(message="Password reset successfully. You can log in now.")


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
