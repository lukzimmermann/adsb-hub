import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type {
  AircraftPositionResponse,
  AirportResponse,
  AirportWriteRequest,
  FlightDetailResponse,
  FlightResponse,
  GroupResponse,
  RecalculateFlightsResponse,
  UserResponse,
} from "./types";

// Anonymous /aircraft calls are rate-limited server-side to one request per
// AIRCRAFT_RATE_LIMIT_SECONDS (default 60s, see api/rate_limit.py). Poll
// slower than that when logged out; authenticated calls aren't limited, so
// poll at roughly the collector's own cadence (POLL_INTERVAL_SECONDS, 15s).
const AUTHENTICATED_POLL_MS = 15_000;
const ANONYMOUS_POLL_MS = 65_000;

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<UserResponse>("/auth/me"),
    retry: false,
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api.post<UserResponse>("/auth/login", credentials),
    onSuccess: (user) => queryClient.setQueryData(["me"], user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSuccess: () => queryClient.setQueryData(["me"], null),
  });
}

export function useCurrentAircraft(isAuthenticated: boolean, enabled = true) {
  return useQuery({
    queryKey: ["aircraft", "current"],
    queryFn: () => api.get<AircraftPositionResponse[]>("/aircraft"),
    refetchInterval: isAuthenticated ? AUTHENTICATED_POLL_MS : ANONYMOUS_POLL_MS,
    enabled,
  });
}

export function useGroupAircraft(groupName: string | null) {
  return useQuery({
    queryKey: ["aircraft", "group", groupName],
    queryFn: () => api.get<AircraftPositionResponse[]>(`/groups/${encodeURIComponent(groupName!)}/aircraft`),
    enabled: groupName !== null,
    refetchInterval: AUTHENTICATED_POLL_MS,
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => api.get<GroupResponse[]>("/groups"),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<GroupResponse>("/groups", { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.delete(`/groups/${encodeURIComponent(name)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useAddRegistration(groupName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (registration: string) =>
      api.post<GroupResponse>(`/groups/${encodeURIComponent(groupName)}/registrations`, { registration }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useRemoveRegistration(groupName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (registration: string) =>
      api.delete(`/groups/${encodeURIComponent(groupName)}/registrations/${encodeURIComponent(registration)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useFlights(groupName: string | null) {
  return useQuery({
    queryKey: ["flights", groupName],
    queryFn: () =>
      groupName === null
        ? api.get<FlightResponse[]>("/flights?limit=200")
        : api.get<FlightResponse[]>(`/groups/${encodeURIComponent(groupName)}/flights?limit=200`),
  });
}

export function useFlight(flightId: number) {
  return useQuery({
    queryKey: ["flight", flightId],
    queryFn: () => api.get<FlightDetailResponse>(`/flights/${flightId}`),
  });
}

export function useAircraftHistory(registration: string | null, limit = 200) {
  return useQuery({
    queryKey: ["aircraft", "history", registration, limit],
    queryFn: () =>
      api.get<AircraftPositionResponse[]>(
        `/aircraft/${encodeURIComponent(registration!)}/history?limit=${limit}`,
      ),
    enabled: registration !== null,
  });
}

export function useAirports() {
  return useQuery({
    queryKey: ["airports"],
    queryFn: () => api.get<AirportResponse[]>("/airports"),
  });
}

export function useCreateAirport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (airport: AirportWriteRequest) => api.post<AirportResponse>("/airports", airport),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["airports"] }),
  });
}

export function useUpdateAirport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, airport }: { id: number; airport: AirportWriteRequest }) =>
      api.put<AirportResponse>(`/airports/${id}`, airport),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["airports"] }),
  });
}

export function useDeleteAirport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/airports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["airports"] }),
  });
}

export function useRecalculateFlights() {
  return useMutation({
    mutationFn: () => api.post<RecalculateFlightsResponse>("/airports/recalculate-flights"),
  });
}
