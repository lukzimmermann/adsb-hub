import L from "leaflet";
import { Marker } from "react-leaflet";

function scrubIcon() {
  return L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:rgba(251,191,36,0.25);border:2px solid #fbbf24;box-shadow:0 0 10px rgba(251,191,36,0.8);"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// The position a hovered point on the aircraft's metrics chart maps to —
// distinct from the live aircraft marker so it doesn't read as "the plane is
// here now" when scrubbing through its history.
export function AircraftScrubMarker({ position }: { position: [number, number] }) {
  return <Marker position={position} icon={scrubIcon()} interactive={false} />;
}
