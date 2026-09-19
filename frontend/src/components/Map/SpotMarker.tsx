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
  const isHigh = risk === "high";

  return (
    <CircleMarker
      center={[spot.lat, spot.lng]}
      radius={isSelected ? 13 : isCritical ? 11 : 9}
      pathOptions={{
        color: isSelected ? "#ffffff" : color,
        weight: isSelected ? 3.5 : 2,
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.85,
      }}
      eventHandlers={{
        click: () => onSelect(spot),
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div className="text-xs p-1 min-w-[140px] font-sans">
          <div className="font-bold text-white leading-tight">{spot.name}</div>
          <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-slate-700/80">
            <span
              className="text-[10px] font-mono uppercase font-semibold px-1 py-0.5 rounded"
              style={{
                backgroundColor: `${color}25`,
                color: color,
              }}
            >
              {risk}
            </span>
            <span className="text-[11px] font-mono text-slate-300">
              P: {formatPercent(spot.p_actual)}
            </span>
          </div>
          {spot.cause_label && (
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Cause: {spot.cause_label === "drainage_failure" ? "Drain Failure" : "Rainfall"}
            </div>
          )}
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
