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
  const color = RISK_COLORS[risk] || "#64748b";
  const isCritical = risk === "critical";

  return (
    <CircleMarker
      center={[spot.lat, spot.lng]}
      radius={isSelected ? 10 : isCritical ? 9 : 7}
      pathOptions={{
        color: isSelected ? "#0f172a" : color,
        weight: isSelected ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.85,
        className: isCritical ? "animate-critical-pulse" : "",
      }}
      eventHandlers={{
        click: () => onSelect(spot),
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
        <div className="p-2 min-w-[150px] font-sans text-xs bg-white text-[#1a1f2e] border border-[#d4dae3] rounded-sm">
          <div className="font-bold text-[#1a1f2e] leading-tight flex items-center justify-between gap-1">
            <span>{spot.name}</span>
            <span className="font-mono text-[10px] text-[#5b6478]">#{spot.spot_id}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-[#e2e8f0]">
            <span
              className="text-[10px] font-mono uppercase font-bold px-1 py-0.2 border"
              style={{
                borderColor: color,
                color: color,
              }}
            >
              {risk}
            </span>
            <span className="text-[11px] font-mono text-[#1a1f2e]">
              P: {formatPercent(spot.p_actual)}
            </span>
          </div>
          {spot.cause_label && (
            <div className="text-[10px] text-[#5b6478] mt-1 font-mono uppercase">
              Cause: {spot.cause_label === "drainage_failure" ? "Drain Failure" : "Rainfall"}
            </div>
          )}
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
