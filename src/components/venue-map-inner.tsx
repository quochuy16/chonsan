"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  href?: string;
}

export default function VenueMapInner({
  points,
  center,
  zoom = 13,
  height = 360,
  me,
}: {
  points: MapPoint[];
  center: [number, number];
  zoom?: number;
  height?: number;
  me?: [number, number] | null;
}) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height, width: "100%" }} className="z-0 rounded-2xl" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {me && <CircleMarker center={me} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9 }} />}
      {points.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={10}
          pathOptions={{ color: "#027a48", fillColor: "#12b76a", fillOpacity: 0.9, weight: 2 }}>
          <Popup>
            <strong>{p.title}</strong>
            {p.subtitle && <div>{p.subtitle}</div>}
            {p.href && <a href={p.href}>Xem sân →</a>}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
