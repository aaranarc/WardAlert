"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { SpotRisk } from "@/lib/types";
import { MAP_CENTER, DEFAULT_ZOOM, RISK_COLORS } from "@/lib/constants";
import { SpotMarker } from "./SpotMarker";
import { WardBoundary } from "./WardBoundary";

interface MapControllerProps {
  selectedSpot: SpotRisk | null;
}

function MapController({ selectedSpot }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot) {
      map.flyTo([selectedSpot.lat, selectedSpot.lng], 15, {
        duration: 0.8,
      });
    }
  }, [selectedSpot, map]);

  return null;
}

function CoordinatesTracker({
  onCoordsChange,
}: {
  onCoordsChange: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    mousemove(e) {
      onCoordsChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

interface FloodMapProps {
  spots: SpotRisk[];
  selectedSpot: SpotRisk | null;
  onSelectSpot: (spot: SpotRisk) => void;
}

export default function FloodMap({ spots, selectedSpot, onSelectSpot }: FloodMapProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 19.0027,
    lng: 72.8278,
  });

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#e5eef4]">
      {/* Top-Right Floating Risk Tier Legend (Matching Uploaded Map Screenshot) */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-lg border border-slate-200/90 shadow-md font-sans select-none pointer-events-auto">
        <div className="text-[10px] font-mono font-bold tracking-wider text-slate-900 uppercase mb-1.5">
          Risk Tier Legend
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-800 font-medium">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: RISK_COLORS.critical }}
            />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: RISK_COLORS.high }}
            />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: RISK_COLORS.moderate }}
            />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: RISK_COLORS.low }}
            />
            <span>Low</span>
          </div>
        </div>
      </div>

      {/* Bottom-Left Floating Coordinates Pill (Matching Uploaded Map Screenshot) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-sm text-[11px] font-mono text-slate-800 select-none pointer-events-auto tracking-wide">
        COORDINATES: {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
      </div>

      <MapContainer
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* OpenStreetMap Tiles: 100% Free, Public, Zero API Key Required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <CoordinatesTracker onCoordsChange={setCoords} />
        <WardBoundary />

        {spots.map((spot) => (
          <SpotMarker
            key={spot.spot_id}
            spot={spot}
            isSelected={selectedSpot?.spot_id === spot.spot_id}
            onSelect={onSelectSpot}
          />
        ))}

        <MapController selectedSpot={selectedSpot} />
      </MapContainer>
    </div>
  );
}
