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
    // Non-interactive: the boundary loads after the markers and sits above them
    // in the same SVG, so an interactive fill would swallow every marker click.
    <GeoJSON
      data={geoData}
      interactive={false}
      style={() => ({
        color: "#1e293b",
        weight: 2.5,
        opacity: 1,
        fillColor: "#0066cc",
        fillOpacity: 0.04,
      })}
    />
  );
}
