from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import InvalidToken, verify_id_token
from app.models.user import User

# auto_error=False so a missing header is a 401 (handled below) rather than FastAPI's 403.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise credentials_error
    try:
        claims = verify_id_token(credentials.credentials)
    except InvalidToken:
        raise credentials_error

    email = claims.get("email", "")
    if email.strip().lower() not in settings.allowed_emails_set:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not allowed")

    user = db.query(User).filter(User.cognito_sub == claims["sub"]).first()
    if user is None:
        user = User(cognito_sub=claims["sub"], email=email, display_name=claims.get("name"))
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
