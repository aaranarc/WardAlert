"use client";

import React, { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";

export function WardBoundary() {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    fetch("/ward-g-south.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setGeoData(data))
      .catch((err) => console.warn("[WardBoundary] Failed to load GeoJSON boundary:", err));
  }, []);

  if (!geoData) return null;

  return (
    <GeoJSON
      data={geoData}
      style={() => ({
        color: "#0066cc",
        weight: 2,
        opacity: 0.85,
        dashArray: "5, 5",
        fillColor: "#0066cc",
        fillOpacity: 0.05,
      })}
    />
  );
}
