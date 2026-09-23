"use client";

import React from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import { SpotRisk } from "@/lib/types";
import { RISK_COLORS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";

interface SpotMarkerProps {
  spot: SpotRisk;
  isSelected: boolean;
  onSelect: (spot: SpotRisk) => void;
}

export function SpotMarker({ spot, isSelected, onSelect }: SpotMarkerProps) {
  const risk = spot.risk_level || "unknown";
  const color = RISK_COLORS[risk] || "#94a3b8";

  const isCritical = risk === "critical";

  return (
    <CircleMarker
      center={[spot.lat, spot.lng]}
      radius={isSelected ? 11 : isCritical ? 9.5 : 8}
      pathOptions={{
        color: isSelected ? "#0f172a" : "#ffffff",
        weight: isSelected ? 3 : 1.5,
        fillColor: color,
        fillOpacity: 0.95,
      }}
      eventHandlers={{
        click: () => onSelect(spot),
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
        <div className="text-xs p-1.5 min-w-[130px] font-sans">
          <div className="font-semibold text-slate-900 leading-tight">{spot.name}</div>
          <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-slate-100">
            <span
              className="text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${color}18`,
                color: color,
              }}
            >
              {risk}
            </span>
            <span className="text-[11px] font-mono text-slate-700 font-medium">
              {formatPercent(spot.p_actual)}
            </span>
          </div>
          {spot.cause_label && (
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              {spot.cause_label === "drainage_failure" ? "Drain Failure" : "Rainfall"}
            </div>
          )}
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
