"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSpots } from "@/hooks/useSpots";
import { useAlertsLog } from "@/hooks/useAlertsLog";
import { useSubscriberCount } from "@/hooks/useSubscriberCount";
import { AlertLog } from "@/components/Alerts/AlertLog";
import { Send, MapPin, Users, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

function AlertsContent() {
  const searchParams = useSearchParams();
  const urlSpotId = searchParams.get("spot_id");

  const { spots } = useSpots();
  const { logs, isLoading, broadcast, isSending, sendError, mutate } = useAlertsLog(100);

  const [selectedSpotId, setSelectedSpotId] = useState<number | "">("");
  const [lastBroadcast, setLastBroadcast] = useState<{ spotName: string; count: number } | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);

  const { count: subscriberCount, mutate: refetchCount } = useSubscriberCount(
    selectedSpotId === "" ? null : selectedSpotId
  );
  const selectedSpot = spots.find((s) => s.spot_id === selectedSpotId);

  // Auto-select spot from query param if provided, otherwise default to first spot
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
    setLastBroadcast(null);

    if (!selectedSpotId) {
      setFormError("Please select a target flood spot.");
      return;
    }

    const response = await broadcast(Number(selectedSpotId));

    if (response) {
      setLastBroadcast({
        spotName: selectedSpot?.name ?? `#${selectedSpotId}`,
        count: response.broadcast_count,
      });
      refetchCount();
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              Emergency Broadcast & Alert Dispatch
            </h1>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#7B68EE]/20 text-[#b8a9ff] border border-[#7B68EE]/30">
              Multilingual WhatsApp
            </span>
          </div>
          <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-2xl">
            Broadcast the live XGBoost risk to every citizen subscribed to a spot over WhatsApp, each in their own language. Subscriptions lapse 7 days after the citizen shares a location unless they reply EXTEND.
          </p>
        </div>

        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12122b] hover:bg-[#1a1a3e] border border-[#7B68EE]/30 text-slate-300 hover:text-white text-xs font-mono transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#b8a9ff]" />
          <span>Refresh Log</span>
        </button>
      </div>

      {/* Main Grid: Left Form / Right Log Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
        {/* Left Col: Broadcast Form (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-[#12122b] border border-[#7B68EE]/30 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#7B68EE]/20">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-[#7B68EE] to-[#b8a9ff] text-white">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  Broadcast to Subscribers
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  Runs live model & alerts every active subscriber
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Spot Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#b8a9ff]" />
                  <span>Target Flood Spot</span>
                </label>
                <select
                  value={selectedSpotId}
                  onChange={(e) => setSelectedSpotId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#0d0d1a] border border-slate-700/80 text-white focus:outline-none focus:border-[#7B68EE] font-sans"
                >
                  <option value="" disabled>
                    Select a flood location...
                  </option>
                  {spots.map((s) => (
                    <option key={s.spot_id} value={s.spot_id}>
                      #{s.spot_id} {s.name} ({s.risk_level || "unknown"} risk)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0d0d1a] border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#b8a9ff] shrink-0" />
                <span>
                  {subscriberCount === null
                    ? "Counting active subscribers..."
                    : `${subscriberCount} active subscriber${subscriberCount === 1 ? "" : "s"} at this spot`}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Subscribers are stored as phone hashes only, so each message is rendered and
                logged as simulated in the audit trail.
              </p>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs font-mono text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {sendError ? (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs font-mono text-rose-300">
                  Error broadcasting alert. Ensure backend is running.
                </div>
              ) : null}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSending || !subscriberCount}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7B68EE] to-[#9d8df1] hover:from-[#6c58e8] hover:to-[#8c78eb] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#7B68EE]/25 transition-all disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isSending ? "animate-spin" : ""}`} />
                <span>
                  {isSending
                    ? "Predicting & Broadcasting..."
                    : `Broadcast to ${subscriberCount ?? "…"} subscriber${subscriberCount === 1 ? "" : "s"}`}
                </span>
              </button>
            </form>
          </div>

          {/* Last Broadcast Result Card */}
          {lastBroadcast && (
            <div className="p-4 rounded-2xl bg-[#0e1726] border border-emerald-500/40 shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Broadcast {lastBroadcast.count} alert{lastBroadcast.count === 1 ? "" : "s"} for{" "}
                  {lastBroadcast.spotName}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Alert Audit Log Table (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col min-h-[550px]">
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
        <div className="flex items-center justify-center h-full min-h-[500px] text-slate-400 font-mono text-sm">
          Loading alerts center...
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
