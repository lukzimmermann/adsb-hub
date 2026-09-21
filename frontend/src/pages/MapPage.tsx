import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useCurrentFlightTrail, useCurrentAircraft, useGroupAircraft } from "../api/queries";
import type { AircraftPositionResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AircraftDetailPanel } from "../components/AircraftDetailPanel";
import { AircraftList } from "../components/AircraftList";
import { AircraftMarker } from "../components/AircraftMarker";
import type { HoverPosition } from "../components/AircraftMetricsChart";
import { AircraftScrubMarker } from "../components/AircraftScrubMarker";
import { AircraftSearch } from "../components/AircraftSearch";
import { AircraftTrail } from "../components/AircraftTrail";
import { GroupSelect } from "../components/GroupSelect";
import { MapView } from "../components/MapView";
import { matchesAircraftQuery } from "../lib/aircraftSearch";

export function MapPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [groupName, setGroupName] = useState<string | null>(searchParams.get("group"));
  const [selectedSnapshot, setSelected] = useState<AircraftPositionResponse | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [scrubPosition, setScrubPosition] = useState<HoverPosition | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const allAircraft = useCurrentAircraft(user !== null && user !== undefined, groupName === null);
  const groupAircraft = useGroupAircraft(groupName);
  const { data: aircraft, isLoading, isError } = groupName === null ? allAircraft : groupAircraft;

  const list = aircraft ?? [];
  // Follow the selected aircraft across polls: each poll returns fresh rows
  // with new ids, so the clicked snapshot alone would go stale.
  const selected = useMemo(
    () =>
      selectedSnapshot &&
      (list.find((a) => a.transponder_code === selectedSnapshot.transponder_code) ?? selectedSnapshot),
    [list, selectedSnapshot],
  );
  const { data: history } = useCurrentFlightTrail(selected?.registration ?? null);
  const filteredList = useMemo(
    () => (filterQuery ? list.filter((a) => matchesAircraftQuery(a, filterQuery)) : list),
    [list, filterQuery],
  );

  function selectAircraft(position: AircraftPositionResponse | null) {
    setSelected(position);
    setScrubPosition(null);
    setIsSidebarOpen(false);
  }

  function clearFilter() {
    setFilterQuery("");
    setSearchValue("");
  }

  return (
    <div className="flex h-full gap-0 p-0 sm:gap-3 sm:p-3">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-[1150] bg-black/50 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[1200] flex w-full max-w-xs flex-col overflow-hidden border-r border-white/5 bg-slate-800/95 shadow-soft backdrop-blur transition-transform duration-200 ease-out sm:static sm:z-auto sm:w-80 sm:max-w-none sm:translate-x-0 sm:rounded-2xl sm:border sm:bg-slate-800/70 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-2 border-b border-white/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300 sm:hidden">Flugzeuge</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white sm:hidden"
              aria-label="Liste schliessen"
            >
              ✕
            </button>
          </div>
          {user && <GroupSelect value={groupName} onChange={setGroupName} />}
          <AircraftSearch
            aircraft={list}
            value={searchValue}
            onChange={setSearchValue}
            onSubmit={setFilterQuery}
            onSelect={selectAircraft}
          />
          {filterQuery && (
            <div className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-300">
              <span className="truncate">Filter: „{filterQuery}“</span>
              <button
                onClick={clearFilter}
                className="ml-auto text-indigo-300 hover:text-white"
                aria-label="Filter entfernen"
              >
                ✕
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400">
            {isLoading
              ? "Lädt…"
              : isError
                ? "Fehler beim Laden"
                : filterQuery
                  ? `${filteredList.length} von ${list.length} Flugzeugen`
                  : `${list.length} Flugzeuge`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AircraftList
            aircraft={filteredList}
            selectedId={selected?.id ?? null}
            onSelect={selectAircraft}
            onHover={setHoveredId}
          />
        </div>
      </aside>

      <div className="relative flex-1 overflow-hidden border-0 border-white/5 shadow-soft sm:rounded-2xl sm:border">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute right-3 top-3 z-[1000] rounded-full bg-slate-800/90 p-2.5 text-slate-200 shadow-soft sm:hidden"
          aria-label="Flugzeugliste öffnen"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>
        <MapView>
          {filteredList.map((position) => (
            <AircraftMarker
              key={position.id}
              aircraft={position}
              highlighted={hoveredId === position.id || selected?.id === position.id}
              onSelect={selectAircraft}
            />
          ))}
          {history && <AircraftTrail history={history} />}
          {scrubPosition && (
            <AircraftScrubMarker position={[scrubPosition.latitude, scrubPosition.longitude]} />
          )}
        </MapView>
        {selected && (
          <AircraftDetailPanel
            aircraft={selected}
            history={history}
            onClose={() => selectAircraft(null)}
            onHoverPosition={setScrubPosition}
          />
        )}
      </div>
    </div>
  );
}
