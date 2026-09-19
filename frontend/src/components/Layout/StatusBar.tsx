"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { HealthResponse } from "@/lib/types";
import { ShieldCheck, ShieldAlert, Activity, Wifi, RefreshCw } from "lucide-react";

export function StatusBar() {
  const { data: health, error, mutate, isValidating } = useSWR<HealthResponse>(
    "/api/health",
    () => api.getHealth(),
    { refreshInterval: 15000 }
  );

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [minutesAgo, setMinutesAgo] = useState<string>("just now");

  useEffect(() => {
    if (health) {
      setLastUpdated(new Date());
    }
  }, [health]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
      if (diffSec < 15) {
        setMinutesAgo("just now");
      } else if (diffSec < 60) {
        setMinutesAgo(`${diffSec}s ago`);
      } else {
        const mins = Math.floor(diffSec / 60);
        setMinutesAgo(`${mins}m ago`);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const isHealthy = health?.status === "ok" && health.db && health.models_loaded;

  return (
    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
      {/* Backend Status indicator */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800">
        <span
          className={`w-2 h-2 rounded-full ${
            isHealthy
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"
              : error
              ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
              : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          }`}
        />
        <span className="text-slate-300">
          {isHealthy ? "API v" + (health?.version || "0.1.0") : error ? "API Offline" : "Connecting..."}
        </span>
        {health?.models_loaded && (
          <span className="hidden sm:inline-block text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40 ml-1">
            Dual XGBoost
          </span>
        )}
      </div>

      {/* Last Updated */}
      <button
        onClick={() => mutate()}
        title="Click to refresh status"
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RefreshCw
          className={`w-3 h-3 ${isValidating ? "animate-spin text-accent-light" : ""}`}
        />
        <span>Updated: {minutesAgo}</span>
      </button>
    </div>
  );
}
