"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { SpotRisk } from "@/lib/types";
import { MAP_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { SpotMarker } from "./SpotMarker";
import { WardBoundary } from "./WardBoundary";

interface MapControllerProps {
  center: [number, number];
  zoom: number;
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

interface FloodMapProps {
  spots: SpotRisk[];
  selectedSpot: SpotRisk | null;
  onSelectSpot: (spot: SpotRisk) => void;
}

export default function FloodMap({ spots, selectedSpot, onSelectSpot }: FloodMapProps) {
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100">
      <MapContainer
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* CARTO now stamps "API KEY REQUIRED" into keyless tiles; OSM's
            standard tiles need no key, only this attribution. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
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
      </MapContainer>
    </div>
  );
}
