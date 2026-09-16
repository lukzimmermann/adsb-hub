from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from api.settings import load_settings
from shared.models import User

COOKIE_NAME = "access_token"

settings = load_settings()

# auto_error=False: the Authorization header is only one of two ways to
# authenticate (see get_optional_user), so a missing header must not 401 by
# itself. Swagger UI's "Authorize" dialog uses this to test protected
# endpoints with username/password instead of a raw cookie value.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def authenticate(user: User | None, password: str) -> User:
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    return user


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user.id), "username": user.username, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


class AuthenticatedUser:
    def __init__(self, id: int, username: str) -> None:
        self.id = id
        self.username = username


def _decode_token(token: str) -> AuthenticatedUser | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    return AuthenticatedUser(id=int(payload["sub"]), username=payload["username"])


async def get_optional_user(
    request: Request, bearer_token: str | None = Depends(oauth2_scheme)
) -> AuthenticatedUser | None:
    token = bearer_token or request.cookies.get(COOKIE_NAME)
    if token is None:
        return None
    return _decode_token(token)


async def get_current_user(
    user: AuthenticatedUser | None = Depends(get_optional_user),
) -> AuthenticatedUser:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    return user
