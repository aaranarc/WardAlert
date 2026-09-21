"use client";

import React from "react";
import { CircleMarker, Popup } from "react-leaflet";
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

  return (
    <CircleMarker
      center={[spot.lat, spot.lng]}
      radius={8}
      pathOptions={{
        color: isSelected ? "#0f172a" : color,
        weight: isSelected ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      }}
      eventHandlers={{
        click: () => onSelect(spot),
      }}
    >
      <Popup className="dark-popup">
        <div className="bg-[#1f2937] text-white p-3 rounded-lg text-xs font-sans min-w-[160px]">
          <div className="font-bold text-sm text-white leading-tight mb-1">
            {spot.name}
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-700">
            <span
              className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: color }}
            >
              {risk}
            </span>
            <span className="text-xs font-mono font-semibold text-white">
              {formatPercent(spot.p_actual)}
            </span>
          </div>
          {spot.cause_label && (
            <div className="text-[10px] text-slate-300 mt-1.5 font-mono">
              Cause: {spot.cause_label === "drainage_failure" ? "Drainage Failure" : "Rainfall Driven"}
            </div>
          )}
          {spot.dispatch_type && (
            <div className="text-[10px] text-slate-400 mt-1 font-sans">
              Protocol: {spot.dispatch_type === "desilting_crew" ? "Desilting Crew" : "Pump & Traffic"}
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}
