"use client";

import React from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { SpotRisk } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

const RISK_FILL_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#eab308",
  low: "#10b981",
  unknown: "#6b7280",
};

// Fill colors darkened 20% for GIS stroke
const RISK_STROKE_COLORS: Record<string, string> = {
  critical: "#bf3636",
  high: "#c47e08",
  moderate: "#bb8f06",
  low: "#0d9467",
  unknown: "#4b5563",
};

interface SpotMarkerProps {
  spot: SpotRisk;
  isSelected: boolean;
  onSelect: (spot: SpotRisk) => void;
}

export function SpotMarker({ spot, isSelected, onSelect }: SpotMarkerProps) {
  const risk = spot.risk_level || "unknown";
  const fillColor = RISK_FILL_COLORS[risk] || "#6b7280";
  const strokeColor = isSelected ? "#000000" : RISK_STROKE_COLORS[risk] || "#4b5563";

  return (
    <CircleMarker
      center={[spot.lat, spot.lng]}
      radius={8}
      pathOptions={{
        color: strokeColor,
        weight: 1.5,
        fillColor: fillColor,
        fillOpacity: 0.9,
        className: "gis-marker",
      }}
      eventHandlers={{
        click: () => onSelect(spot),
      }}
    >
      <Popup className="dark-gis-popup" offset={[0, -4]}>
        <div className="min-w-[180px] font-sans text-xs text-white">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-gray-700">
            <span className="font-semibold text-white truncate text-[13px]">
              {spot.name}
            </span>
            <span className="font-mono text-[10px] text-gray-400 shrink-0">
              #{spot.spot_id}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <span
              className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${fillColor}25`,
                color: fillColor,
                border: `1px solid ${fillColor}60`,
              }}
            >
              {risk}
            </span>
            <span className="text-[11px] font-mono text-gray-200">
              P: {formatPercent(spot.p_actual)}
            </span>
          </div>

          {spot.cause_label && (
            <div className="text-[10px] text-gray-400 mt-1.5 font-mono uppercase">
              Cause: {spot.cause_label === "drainage_failure" ? "Drain Failure" : "Rainfall"}
            </div>
          )}

          <div className="mt-2 pt-1.5 border-t border-gray-700/60 text-[10px] text-gray-400 font-sans">
            Click to view prediction &amp; SHAP attribution
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}
