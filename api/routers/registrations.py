from fastapi import APIRouter, Depends, HTTPException, status

from api.auth import AuthenticatedUser, get_current_user
from api.repositories import GroupRepository
from api.services import GroupService, RegistrationNotFoundError

router = APIRouter(prefix="/api/v1/registrations", tags=["registrations"])
service = GroupService(GroupRepository())


@router.delete("/{registration}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_registration(
    registration: str, user: AuthenticatedUser = Depends(get_current_user)
) -> None:
    try:
        await service.delete_registration(registration, user.id)
    except RegistrationNotFoundError as error:
        raise HTTPException(status_code=404, detail="Registration not found") from error