"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSpots } from "@/hooks/useSpots";
import { useAlertsLog } from "@/hooks/useAlertsLog";
import { AlertLog } from "@/components/Alerts/AlertLog";
import { AlertResponse } from "@/lib/types";
import { IconSend, IconRefresh } from "@/components/Common/Icons";

function AlertsContent() {
  const searchParams = useSearchParams();
  const urlSpotId = searchParams.get("spot_id");

  const { spots } = useSpots();
  const { logs, isLoading, sendAlert, isSending, sendError, mutate } = useAlertsLog(100);

  const [selectedSpotId, setSelectedSpotId] = useState<number | "">("");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "hinglish" | "mr">("en");
  const [recipient, setRecipient] = useState<string>("whatsapp:+919876543210");
  const [lastSentResponse, setLastSentResponse] = useState<AlertResponse | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLastSentResponse(null);

    if (!selectedSpotId) {
      setFormError("Please select a target flood spot.");
      return;
    }

    const response = await sendAlert({
      spot_id: Number(selectedSpotId),
      language: selectedLanguage,
      recipient: recipient.trim() || undefined,
    });

    if (response) {
      setLastSentResponse(response);
    }
  };

  const currentSpot = spots.find((s) => s.spot_id === Number(selectedSpotId));

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Alert Broadcast & Dispatch Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test multilingual notifications and inspect the dispatched audit ledger for Ward G/South.
          </p>
        </div>

        <button
          onClick={() => mutate()}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 w-fit"
          aria-label="Refresh logs"
        >
          <IconRefresh className="w-3.5 h-3.5 text-[#0066cc]" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form Column (5 of 12) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Multilingual Broadcast Form</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dispatches template alerts tailored to the selected spot's risk level.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Spot Selection */}
            <div>
              <label htmlFor="target-spot" className="block text-slate-700 font-medium mb-1">
                Target Flood Spot
              </label>
              <select
                id="target-spot"
                value={selectedSpotId}
                onChange={(e) => setSelectedSpotId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#0066cc]"
              >
                {spots.map((spot) => (
                  <option key={spot.spot_id} value={spot.spot_id}>
                    #{spot.spot_id} {spot.name} ({spot.risk_level || "low"} risk)
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Language Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: "en", name: "English" },
                  { code: "hi", name: "Hindi" },
                  { code: "hinglish", name: "Hinglish" },
                  { code: "mr", name: "Marathi" },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setSelectedLanguage(l.code as any)}
                    className={`p-2 rounded-lg text-left border transition-colors ${
                      selectedLanguage === l.code
                        ? "bg-[#e8f2fc] border-[#0066cc] text-[#0066cc] font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div>{l.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Phone */}
            <div>
              <label htmlFor="recipient-phone" className="block text-slate-700 font-medium mb-1">
                Recipient Identifier
              </label>
              <input
                id="recipient-phone"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="whatsapp:+919876543210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0066cc]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Simulation mode enabled: messages record in the ledger without carrier charges.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2 px-4 rounded-lg bg-[#0066cc] hover:bg-[#0055b3] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <IconSend className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
              <span>{isSending ? "Dispatching..." : "Send Test Alert"}</span>
            </button>
          </form>

          {/* Result Banner */}
          {lastSentResponse && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs">Dispatch Simulated</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {lastSentResponse.sent_at}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-100 whitespace-pre-wrap">
                {lastSentResponse.body}
              </p>
            </div>
          )}

          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}
        </div>

        {/* Audit Log Table Column (7 of 12) */}
        <div className="lg:col-span-7">
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
        <div className="p-8 text-center text-xs text-slate-400">
          Loading alerts console...
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
