from jose import JWTError, jwt
from sqlalchemy.orm import Session

import auth as auth_utils
import models


def authenticate_websocket_user(token: str | None, db: Session) -> models.User | None:
    if not token:
        return None

    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    return db.query(models.User).filter(models.User.id == user_id).first()
