"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSpots } from "@/hooks/useSpots";
import { useAlertsLog } from "@/hooks/useAlertsLog";
import { useSubscriberCount } from "@/hooks/useSubscriberCount";
import { AlertLog } from "@/components/Alerts/AlertLog";
import { AlertResponse, BroadcastResponse } from "@/lib/types";
import { RefreshIcon } from "@/components/Icons";

function AlertsContent() {
  const searchParams = useSearchParams();
  const urlSpotId = searchParams.get("spot_id");

  const { spots } = useSpots();
  const { logs, isLoading, broadcast, isSending, sendError, mutate } = useAlertsLog(100);

  const [selectedSpotId, setSelectedSpotId] = useState<number | "">("");
  const [broadcastMode, setBroadcastMode] = useState<"normal" | "critical">("normal");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "hinglish" | "mr">("en");
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (urlSpotId) {
      const parsed = parseInt(urlSpotId, 10);
      if (!isNaN(parsed)) {
        setSelectedSpotId(parsed);
      }
    } else if (spots.length > 0 && selectedSpotId === "") {
      setSelectedSpotId(spots[0].spot_id);
    }
  }, [urlSpotId, spots, selectedSpotId]);

  const { count: subscriberCount } = useSubscriberCount(selectedSpotId ? Number(selectedSpotId) : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBroadcastResult(null);

    if (!selectedSpotId) {
      setFormError("Please select a target flood location.");
      return;
    }

    const response = await broadcast(Number(selectedSpotId), broadcastMode);
    if (response) {
      setBroadcastResult(response);
    }
  };

  return (
    <div className="p-3 lg:p-4 space-y-3 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-3.25rem)] flex flex-col">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#d4dae3]">
        <div>
          <h1 className="text-base font-bold text-[#1a1f2e] tracking-tight font-sans uppercase">
            EMERGENCY BROADCAST & CITIZEN ALERT CENTER
          </h1>
          <p className="text-xs text-[#5b6478]">
            Multilingual advisory dispatch generated from dual-model flood predictions.
          </p>
        </div>

        <button
          onClick={() => mutate()}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f8fafc] text-[#1a1f2e] text-xs font-mono transition-colors"
        >
          <RefreshIcon className="w-3.5 h-3.5 text-[#1e40af]" />
          <span>REFRESH LOG</span>
        </button>
      </div>

      {/* Main Grid: Left Form / Right Log Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 items-stretch">
        {/* Left Col: Dispatch Form */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="p-3.5 bg-[#ffffff] border border-[#d4dae3] rounded-sm space-y-3">
            <div className="pb-2 border-b border-[#d4dae3] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1a1f2e] font-mono">
                DISPATCH BROADCAST
              </h2>
              <span className="text-[10px] font-mono text-[#5b6478] bg-[#f1f5f9] px-1.5 py-0.5 border border-[#d4dae3]">
                {subscriberCount !== null ? `${subscriberCount} SPOT SUBSCRIBERS` : "SUBSCRIBERS: —"}
              </span>
            </div>

            {/* Mode Toggle */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-semibold uppercase text-[#5b6478] block">
                BROADCAST PROTOCOL MODE:
              </label>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setBroadcastMode("normal")}
                  className={`py-2 px-2.5 border text-center font-bold uppercase transition-colors ${
                    broadcastMode === "normal"
                      ? "bg-[#1e40af] text-white border-[#1e40af]"
                      : "bg-[#ffffff] text-[#1a1f2e] border-[#d4dae3] hover:bg-[#f8fafc]"
                  }`}
                >
                  NORMAL BROADCAST
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastMode("critical")}
                  className={`py-2 px-2.5 border text-center font-bold uppercase transition-colors ${
                    broadcastMode === "critical"
                      ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                      : "bg-[#ffffff] text-[#b91c1c] border-[#fecaca] hover:bg-[#fef2f2]"
                  }`}
                >
                  CRITICAL EMERGENCY
                </button>
              </div>
              <p className="text-[10px] text-[#5b6478] font-mono mt-0.5">
                {broadcastMode === "normal"
                  ? "NORMAL: WhatsApp only to subscribers of selected spot."
                  : "CRITICAL: WhatsApp + SMS to all subscribers within 2km radius."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
              {/* Spot Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-semibold uppercase text-[#5b6478] block">
                  TARGET FLOOD SPOT:
                </label>
                <select
                  value={selectedSpotId}
                  onChange={(e) => setSelectedSpotId(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#ffffff] border border-[#d4dae3] text-[#1a1f2e] focus:outline-none focus:border-[#1e40af]"
                >
                  <option value="" disabled>
                    Select spot location...
                  </option>
                  {spots.map((s) => (
                    <option key={s.spot_id} value={s.spot_id}>
                      #{s.spot_id} {s.name} ({s.risk_level || "unknown"} risk)
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-semibold uppercase text-[#5b6478] block">
                  DEFAULT PREVIEW LANGUAGE:
                </label>
                <div className="grid grid-cols-2 gap-1 font-sans">
                  {[
                    { id: "en", label: "English" },
                    { id: "hi", label: "Hindi (हिंदी)" },
                    { id: "hinglish", label: "Hinglish" },
                    { id: "mr", label: "Marathi (मराठी)" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() =>
                        setSelectedLanguage(
                          lang.id as "en" | "hi" | "hinglish" | "mr"
                        )
                      }
                      className={`py-1.5 px-2 text-xs font-medium border text-left transition-colors ${
                        selectedLanguage === lang.id
                          ? "bg-[#1e40af] text-white border-[#1e40af]"
                          : "bg-[#ffffff] text-[#1a1f2e] border-[#d4dae3] hover:bg-[#f8fafc]"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="p-2 bg-[#fef2f2] border border-[#fecaca] text-[11px] font-mono text-[#b91c1c]">
                  {formError}
                </div>
              )}

              {sendError ? (
                <div className="p-2 bg-[#fef2f2] border border-[#fecaca] text-[11px] font-mono text-[#b91c1c]">
                  Error dispatching broadcast. Verify backend is reachable.
                </div>
              ) : null}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSending}
                className={`w-full py-2.5 px-3 font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 text-white font-mono ${
                  broadcastMode === "critical"
                    ? "bg-[#b91c1c] hover:bg-[#991b1b]"
                    : "bg-[#1e40af] hover:bg-[#1d4ed8]"
                }`}
              >
                {isSending
                  ? "TRANSMITTING BROADCAST..."
                  : broadcastMode === "critical"
                  ? "SEND CRITICAL EMERGENCY BROADCAST"
                  : "SEND NORMAL BROADCAST"}
              </button>
            </form>
          </div>

          {/* Broadcast Confirmation Card */}
          {broadcastResult && (
            <div className="p-3.5 bg-[#ffffff] border border-[#166534] rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#166534] uppercase font-mono">
                  TRANSMISSION CONFIRMED
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] uppercase font-bold">
                  {broadcastResult.mode || broadcastMode}
                </span>
              </div>

              <div className="bg-[#f0fdf4] p-3 border border-[#bbf7d0] text-xs font-mono text-[#166534] font-semibold leading-relaxed">
                {broadcastResult.message ||
                  (broadcastResult.mode === "critical"
                    ? `Broadcasted to ${broadcastResult.broadcast_count} subscribers via WhatsApp + SMS`
                    : `Broadcasted to ${broadcastResult.broadcast_count} subscribers via WhatsApp`)}
              </div>

              <div className="text-[10px] text-[#5b6478] font-mono flex items-center justify-between pt-1">
                <span>Spot ID: #{selectedSpotId}</span>
                <span>
                  Channels:{" "}
                  {broadcastResult.channels?.join(", ").toUpperCase() ||
                    (broadcastMode === "critical" ? "WHATSAPP, SMS" : "WHATSAPP")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Alert Audit Log Table */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          <AlertLog logs={logs} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full min-h-[400px] text-[#5b6478] font-mono text-xs">
          LOADING DISPATCH LOGS...
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
