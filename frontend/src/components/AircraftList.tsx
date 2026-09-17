import type { AircraftPositionResponse } from "../api/types";

interface Props {
  aircraft: AircraftPositionResponse[];
  selectedId: number | null;
  onSelect: (aircraft: AircraftPositionResponse) => void;
  onHover: (id: number | null) => void;
}

function label(a: AircraftPositionResponse): string {
  return a.registration ?? a.callsign?.trim() ?? a.transponder_code;
}

export function AircraftList({ aircraft, selectedId, onSelect, onHover }: Props) {
  if (aircraft.length === 0) {
    return <p className="px-3 py-2 text-sm text-slate-500">Keine Flugzeuge sichtbar.</p>;
  }

  return (
    <ul className="divide-y divide-white/5">
      {aircraft.map((a) => (
        <li
          key={a.id}
          onMouseEnter={() => onHover(a.id)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(a)}
          className={`cursor-pointer border-l-2 px-3 py-2 text-sm transition-colors hover:bg-white/5 ${
            selectedId === a.id ? "border-indigo-400 bg-indigo-500/10" : "border-transparent"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-100">{label(a)}</span>
            {a.geometric_altitude !== null && (
              <span className="text-xs text-slate-400">{a.geometric_altitude} ft</span>
            )}
          </div>
          {a.callsign?.trim() && <div className="text-xs text-slate-500">{a.callsign.trim()}</div>}
        </li>
      ))}
    </ul>
  );
}
