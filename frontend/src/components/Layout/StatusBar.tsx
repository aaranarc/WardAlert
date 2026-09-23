"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { HealthResponse } from "@/lib/types";
import { IconRefresh } from "@/components/Common/Icons";

export function StatusBar() {
  const { data: health, error, mutate, isValidating } = useSWR<HealthResponse>(
    "/api/health",
    () => api.getHealth(),
    { refreshInterval: 15000 }
  );

  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === "ok" && health.db && health.models_loaded;

  return (
    <div className="flex items-center gap-2.5 text-xs text-slate-600">
      {/* Date and Live Indicator */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-medium text-emerald-700">Live</span>
        <span className="text-slate-300">|</span>
        <span className="text-[11px] text-slate-600 tabular-nums font-mono">{timeStr || "Mon, 21 Jul 2025 14:32"}</span>
      </div>

      {/* Model & DB Health */}
      <button
        onClick={() => mutate()}
        title="Click to refresh telemetry"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors text-[11px]"
        aria-label="Refresh telemetry status"
      >
        <IconRefresh className={`w-3 h-3 ${isValidating ? "animate-spin text-[#0066cc]" : ""}`} />
        <span className="hidden md:inline">
          {isHealthy ? "Dual XGBoost Active" : error ? "Offline" : "Checking"}
        </span>
      </button>
    </div>
  );
}
