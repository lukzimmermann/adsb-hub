import { useMemo, useState, type KeyboardEvent } from "react";

import type { AircraftPositionResponse } from "../api/types";
import { matchesAircraftQuery } from "../lib/aircraftSearch";
import { input } from "../ui";

interface Props {
  aircraft: AircraftPositionResponse[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSelect: (aircraft: AircraftPositionResponse) => void;
}

function label(a: AircraftPositionResponse): string {
  return a.registration ?? a.callsign?.trim() ?? a.transponder_code;
}

export function AircraftSearch({ aircraft, value, onChange, onSubmit, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (value.trim().length === 0) return [];
    return aircraft.filter((a) => matchesAircraftQuery(a, value)).slice(0, 8);
  }, [aircraft, value]);

  function handleSelect(a: AircraftPositionResponse) {
    onSelect(a);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit(value);
      setIsOpen(false);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Flugzeug suchen, Enter zum Filtern…"
        className={`w-full py-1.5 text-sm ${input}`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-800 shadow-soft">
          {results.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(a)}
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-200 first:rounded-t-xl last:rounded-b-xl hover:bg-white/5"
              >
                <span className="font-medium text-white">{label(a)}</span>
                {a.callsign?.trim() && <span className="ml-2 text-xs text-slate-400">{a.callsign.trim()}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isOpen && value.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-slate-500 shadow-soft">
          Keine Treffer
        </div>
      )}
    </div>
  );
}
