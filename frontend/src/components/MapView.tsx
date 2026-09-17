import type { ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

// Matches config.yaml area.center (ADS-B reception area, central Switzerland).
const DEFAULT_CENTER: [number, number] = [46.756467, 8.141683];
const DEFAULT_ZOOM = 8;

export function MapView({ children }: { children?: ReactNode }) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
