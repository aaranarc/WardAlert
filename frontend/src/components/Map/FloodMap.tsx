"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { SpotRisk } from "@/lib/types";
import { MAP_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { SpotMarker } from "./SpotMarker";
import { WardBoundary } from "./WardBoundary";

interface MapControllerProps {
  center: [number, number];
  zoom: number;
  selectedSpot: SpotRisk | null;
}

function MapController({ center, zoom, selectedSpot }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot) {
      map.flyTo([selectedSpot.lat, selectedSpot.lng], 15, {
        duration: 0.6,
      });
    }
  }, [selectedSpot, map]);

  return null;
}

function CoordinatesTracker({ onCoordsChange }: { onCoordsChange: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    mousemove: (e) => {
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
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({
    lat: MAP_CENTER[0],
    lng: MAP_CENTER[1],
  });

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#e2e8f0]">
      <MapContainer
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap &copy; CARTO"
          url="https://basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <WardBoundary />
        {spots.map((spot) => (
          <SpotMarker
            key={spot.spot_id}
            spot={spot}
            isSelected={selectedSpot?.spot_id === spot.spot_id}
            onSelect={onSelectSpot}
          />
        ))}
        <MapController
          center={MAP_CENTER}
          zoom={DEFAULT_ZOOM}
          selectedSpot={selectedSpot}
        />
        <CoordinatesTracker onCoordsChange={setCursorCoords} />
      </MapContainer>

      {/* Real-time Cursor Coordinate Readout */}
      <div className="absolute bottom-2 left-2 z-10 bg-[#ffffff] border border-[#d4dae3] px-2.5 py-1 text-[11px] font-mono text-[#1a1f2e] shadow-sm select-none pointer-events-none">
        <span className="text-[#5b6478]">COORDINATES:</span>{" "}
        <span>{cursorCoords.lat.toFixed(4)}° N, {cursorCoords.lng.toFixed(4)}° E</span>
      </div>
    </div>
  );
}
