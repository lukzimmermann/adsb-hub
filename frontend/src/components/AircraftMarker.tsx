import L from "leaflet";
import { Marker } from "react-leaflet";

import type { AircraftPositionResponse } from "../api/types";

function buildIcon(rotationDeg: number, highlighted: boolean) {
  const size = highlighted ? 44 : 32;
  const halo = highlighted
    ? "background: rgba(99,102,241,0.25); border-radius: 9999px; box-shadow: 0 0 0 3px rgba(129,140,248,0.65);"
    : "";
  return L.divIcon({
    html: `<div style="width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; ${halo}">
             <div style="transform: rotate(${rotationDeg}deg); font-size: ${highlighted ? 34 : 32}px; line-height: 1;">✈️</div>
           </div>`,
    className: "aircraft-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface Props {
  aircraft: AircraftPositionResponse;
  highlighted?: boolean;
  onSelect: (aircraft: AircraftPositionResponse) => void;
}

export function AircraftMarker({ aircraft, highlighted = false, onSelect }: Props) {
  if (aircraft.latitude === null || aircraft.longitude === null) {
    return null;
  }
  // The ✈️ glyph's neutral orientation points northeast (~45°), so offset the heading to compensate.
  const rotation = (aircraft.true_heading ?? aircraft.track ?? 0) - 45;

  return (
    <Marker
      position={[aircraft.latitude, aircraft.longitude]}
      icon={buildIcon(rotation, highlighted)}
      eventHandlers={{ click: () => onSelect(aircraft) }}
    />
  );
}
