from fastapi import APIRouter, HTTPException, status

from app.repositories import GroupRepository
from app.schemas import (AircraftPositionResponse, GroupCreateRequest,
                         GroupResponse, RegistrationRequest)
from app.services import (GroupAlreadyExistsError, GroupNotFoundError,
                          GroupService)

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])
service = GroupService(GroupRepository())


def to_response(group) -> GroupResponse:
    return GroupResponse(
        name=group.name,
        registrations=[item.registration for item in group.registrations],
    )


@router.get("", response_model=list[GroupResponse])
async def get_groups() -> list[GroupResponse]:
    return [to_response(group) for group in await service.list()]


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(request: GroupCreateRequest) -> GroupResponse:
    try:
        group = await service.create(request.name)
    except GroupAlreadyExistsError as error:
        raise HTTPException(status_code=409, detail="Group already exists") from error
    return GroupResponse(name=group.name, registrations=[])


@router.delete("/{group_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_name: str) -> None:
    try:
        await service.delete(group_name)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error


@router.get("/{group_name}/aircraft", response_model=list[AircraftPositionResponse])
async def get_group_aircraft(group_name: str):
    try:
        return await service.current_aircraft(group_name)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error


@router.post("/{group_name}/registrations", response_model=GroupResponse)
async def add_registration(
    group_name: str, request: RegistrationRequest
) -> GroupResponse:
    try:
        group = await service.add_registration(group_name, request.registration)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error
    return to_response(group)


@router.delete(
    "/{group_name}/registrations/{registration}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_registration(group_name: str, registration: str) -> None:
    try:
        await service.remove_registration(group_name, registration)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error

