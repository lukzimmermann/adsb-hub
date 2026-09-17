from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.auth import AuthenticatedUser, get_current_user
from api.repositories import FlightRepository, GroupRepository
from api.routers.flights import to_response as to_flight_response
from api.schemas import (AircraftPositionResponse, FlightResponse,
                         GroupCreateRequest, GroupResponse,
                         RegistrationRequest)
from api.services import (FlightService, GroupAlreadyExistsError,
                          GroupNotFoundError, GroupService)

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])
service = GroupService(GroupRepository())
flight_service = FlightService(FlightRepository(), GroupRepository())


def to_response(group) -> GroupResponse:
    return GroupResponse(
        name=group.name,
        registrations=[item.registration for item in group.registrations],
    )


@router.get("", response_model=list[GroupResponse])
async def get_groups(user: AuthenticatedUser = Depends(get_current_user)) -> list[GroupResponse]:
    return [to_response(group) for group in await service.list(user.id)]


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    request: GroupCreateRequest, user: AuthenticatedUser = Depends(get_current_user)
) -> GroupResponse:
    try:
        group = await service.create(request.name, user.id)
    except GroupAlreadyExistsError as error:
        raise HTTPException(status_code=409, detail="Group already exists") from error
    return GroupResponse(name=group.name, registrations=[])


@router.delete("/{group_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_name: str, user: AuthenticatedUser = Depends(get_current_user)
) -> None:
    try:
        await service.delete(group_name, user.id)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error


@router.get("/{group_name}/aircraft", response_model=list[AircraftPositionResponse])
async def get_group_aircraft(
    group_name: str, user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        return await service.current_aircraft(group_name, user.id)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error


@router.get("/{group_name}/flights", response_model=list[FlightResponse])
async def get_group_flights(
    group_name: str,
    limit: int = Query(default=100, ge=1, le=5000),
    user: AuthenticatedUser = Depends(get_current_user),
) -> list[FlightResponse]:
    try:
        flights = await flight_service.list_by_group(group_name, user.id, limit)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error
    return [to_flight_response(flight) for flight in flights]


@router.post("/{group_name}/registrations", response_model=GroupResponse)
async def add_registration(
    group_name: str,
    request: RegistrationRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> GroupResponse:
    try:
        group = await service.add_registration(group_name, request.registration, user.id)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error
    return to_response(group)


@router.delete(
    "/{group_name}/registrations/{registration}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_registration(
    group_name: str, registration: str, user: AuthenticatedUser = Depends(get_current_user)
) -> None:
    try:
        await service.remove_registration(group_name, registration, user.id)
    except GroupNotFoundError as error:
        raise HTTPException(status_code=404, detail="Group not found") from error
