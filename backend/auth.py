import hashlib
import hmac
import os
import base64
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models

# JWT signing key. Set SECRET_KEY in the environment (generate one with:
#   python -c "import secrets; print(secrets.token_urlsafe(64))")
_IS_PRODUCTION = os.getenv("APP_ENV", "").lower() == "production" or bool(os.getenv("RENDER"))
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if _IS_PRODUCTION:
        raise RuntimeError("SECRET_KEY environment variable is required in production.")
    SECRET_KEY = "dev-only-insecure-key-not-for-production"
    print("[auth] WARNING: SECRET_KEY not set; using an insecure development key.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-SHA256 (stdlib, no extra deps)."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 260_000)
    # Store as  salt_b64:hash_b64
    return base64.b64encode(salt).decode() + ":" + base64.b64encode(key).decode()


def verify_password(plain: str, stored: str) -> bool:
    """Verify a password against a PBKDF2-SHA256 hash."""
    try:
        salt_b64, key_b64 = stored.split(":")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(key_b64)
        candidate = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, 260_000)
        return hmac.compare_digest(expected, candidate)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user
