import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";
import type {
  AircraftPositionResponse,
  AirportResponse,
  AirportWriteRequest,
  ConfigResponse,
  FlightDetailResponse,
  FlightResponse,
  GroupResponse,
  RecalculateFlightsResponse,
  UserResponse,
} from "./types";

// Anonymous /aircraft calls are rate-limited server-side to one request per
// AIRCRAFT_RATE_LIMIT_SECONDS (default 60s, see api/rate_limit.py). Poll
// slower than that when logged out; authenticated calls aren't limited, so
// poll at the collector's own cadence (POLL_INTERVAL_SECONDS, served by
// GET /config; DEFAULT_POLL_MS until it has loaded).
const DEFAULT_POLL_MS = 15_000;
const ANONYMOUS_POLL_MS = 65_000;

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<ConfigResponse>("/config"),
    staleTime: Infinity,
  });
}

function usePollMs(): number {
  const { data } = useConfig();
  return data ? data.poll_interval_seconds * 1000 : DEFAULT_POLL_MS;
}

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
  const pollMs = usePollMs();
  return useQuery({
    queryKey: ["aircraft", "current"],
    queryFn: () => api.get<AircraftPositionResponse[]>("/aircraft"),
    refetchInterval: isAuthenticated ? pollMs : ANONYMOUS_POLL_MS,
    enabled,
  });
}

export function useGroupAircraft(groupName: string | null) {
  const pollMs = usePollMs();
  return useQuery({
    queryKey: ["aircraft", "group", groupName],
    queryFn: () => api.get<AircraftPositionResponse[]>(`/groups/${encodeURIComponent(groupName!)}/aircraft`),
    enabled: groupName !== null,
    refetchInterval: pollMs,
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

// since: ISO timestamp; only flights started at or after it are returned.
export function useFlights(groupName: string | null, since: string | null, limit = 1000) {
  return useQuery({
    queryKey: ["flights", groupName, since, limit],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (since !== null) params.set("since", since);
      const base = groupName === null ? "/flights" : `/groups/${encodeURIComponent(groupName)}/flights`;
      return api.get<FlightResponse[]>(`${base}?${params}`);
    },
  });
}

export function useFlight(flightId: number) {
  return useQuery({
    queryKey: ["flight", flightId],
    queryFn: () => api.get<FlightDetailResponse>(`/flights/${flightId}`),
  });
}

// All positions of the aircraft's current flight (newest first), refreshed at
// the collector's cadence so the trail grows as new positions arrive.
export function useCurrentFlightTrail(registration: string | null) {
  const pollMs = usePollMs();
  return useQuery({
    queryKey: ["aircraft", "current-flight", registration],
    queryFn: () =>
      api.get<AircraftPositionResponse[]>(
        `/aircraft/${encodeURIComponent(registration!)}/current-flight`,
      ),
    enabled: registration !== null,
    refetchInterval: pollMs,
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
