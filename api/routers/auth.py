from fastapi import APIRouter, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from api.auth import (COOKIE_NAME, AuthenticatedUser, authenticate,
                      create_access_token, get_current_user, settings)
from api.repositories import UserRepository
from api.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
repository = UserRepository()


@router.post("/login", response_model=UserResponse)
async def login(request: LoginRequest, response: Response) -> UserResponse:
    user = authenticate(await repository.get_by_username(request.username), request.password)

    token = create_access_token(user)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_expires_minutes * 60,
    )
    return UserResponse(username=user.username)


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
async def token(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    """Backs the Swagger UI 'Authorize' dialog; not meant to be called directly."""
    user = authenticate(
        await repository.get_by_username(form_data.username), form_data.password
    )
    return TokenResponse(access_token=create_access_token(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME)


@router.get("/me", response_model=UserResponse)
async def me(user: AuthenticatedUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse(username=user.username)
