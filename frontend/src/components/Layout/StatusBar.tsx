"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { HealthResponse } from "@/lib/types";
import { RefreshIcon } from "@/components/Icons";

export function StatusBar() {
  const { data: health, error, mutate, isValidating } = useSWR<HealthResponse>(
    "/api/health",
    () => api.getHealth(),
    { refreshInterval: 15000 }
  );

  const [timeIST, setTimeIST] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istString = now.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTimeIST(`${istString} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === "ok" && health.db && health.models_loaded;

  return (
    <div className="flex items-center gap-3 text-xs font-mono text-[#5b6478]">
      {/* Real-time IST Clock */}
      <div className="hidden sm:flex items-center px-2 py-0.5 bg-[#f1f5f9] border border-[#d4dae3] text-[#1a1f2e] text-[11px]">
        <span>{timeIST || "--:--:-- IST"}</span>
      </div>

      {/* Backend / Model Status */}
      <div className="flex items-center gap-2 px-2.5 py-0.5 bg-[#ffffff] border border-[#d4dae3] text-[11px]">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isHealthy
              ? "bg-[#166534] animate-live-blink"
              : error
              ? "bg-[#b91c1c]"
              : "bg-[#b45309]"
          }`}
          aria-hidden="true"
        />
        <span className="text-[#1a1f2e] font-medium uppercase tracking-wider text-[10px]">
          {isHealthy ? "30 SPOTS MONITORED" : error ? "SYSTEM OFFLINE" : "CONNECTING"}
        </span>
        {health?.models_loaded && (
          <span className="hidden md:inline text-[10px] text-[#166534] bg-[#f0fdf4] px-1 border border-[#bbf7d0]">
            DUAL XGBOOST
          </span>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={() => mutate()}
        title="Refresh telemetry"
        aria-label="Refresh telemetry status"
        className="flex items-center gap-1 px-2 py-0.5 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f8fafc] text-[#5b6478] hover:text-[#1a1f2e] transition-colors text-[11px]"
      >
        <RefreshIcon
          className={`w-3 h-3 ${isValidating ? "animate-spin text-[#1e40af]" : ""}`}
        />
        <span className="hidden lg:inline">SYNC</span>
      </button>

      {/* Version Tag */}
      <span className="text-[10px] text-[#5b6478] border border-[#d4dae3] px-1.5 py-0.5 bg-[#f8fafc]">
        v{health?.version || "0.1.0"}
      </span>
    </div>
  );
}
