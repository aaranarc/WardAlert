"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSpots } from "@/hooks/useSpots";
import { useAlertsLog } from "@/hooks/useAlertsLog";
import { AlertLog } from "@/components/Alerts/AlertLog";
import { AlertResponse } from "@/lib/types";
import {
  Bell,
  Send,
  Languages,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";

function AlertsContent() {
  const searchParams = useSearchParams();
  const urlSpotId = searchParams.get("spot_id");

  const { spots } = useSpots();
  const { logs, isLoading, sendAlert, isSending, sendError, mutate } = useAlertsLog(100);

  const [selectedSpotId, setSelectedSpotId] = useState<number | "">("");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "hinglish" | "mr">("en");
  const [recipient, setRecipient] = useState<string>("whatsapp:+910000000000");
  const [lastSentResponse, setLastSentResponse] = useState<AlertResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
            Live automated alerts generated on demand via XGBoost predictions and 4-language localized templates (English, Hindi, Hinglish, Marathi).
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
        {/* Left Col: Dispatch Form (4 cols on lg) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-[#12122b] border border-[#7B68EE]/30 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#7B68EE]/20">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-[#7B68EE] to-[#b8a9ff] text-white">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  Send Test Alert
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  Runs live model & dispatches message
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

              {/* Language Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#b8a9ff]" />
                  <span>Broadcast Language</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
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
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all text-left border ${
                        selectedLanguage === lang.id
                          ? "bg-[#1f1f4a] text-white border-[#b8a9ff] shadow-[0_0_12px_rgba(123,104,238,0.3)]"
                          : "bg-[#0d0d1a] text-slate-400 hover:text-slate-200 border-slate-800"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Phone / WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#b8a9ff]" />
                  <span>Recipient Format</span>
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="whatsapp:+919876543210"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#0d0d1a] border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-[#7B68EE] font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Note: In simulated mode without Twilio SID, alerts log cleanly to the audit trail.
                </p>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs font-mono text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {sendError ? (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs font-mono text-rose-300">
                  Error sending alert. Ensure backend is running.
                </div>
              ) : null}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7B68EE] to-[#9d8df1] hover:from-[#6c58e8] hover:to-[#8c78eb] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#7B68EE]/25 transition-all disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isSending ? "animate-spin" : ""}`} />
                <span>{isSending ? "Predicting & Transmitting..." : "Send Test Alert"}</span>
              </button>
            </form>
          </div>

          {/* Last Dispatched Message Card */}
          {lastSentResponse && (
            <div className="p-4 rounded-2xl bg-[#0e1726] border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Alert Successfully Generated!</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  {lastSentResponse.status}
                </span>
              </div>

              <div className="bg-[#0b141a] p-3 rounded-xl border border-[#233138] text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {lastSentResponse.body}
              </div>

              <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Spot: {lastSentResponse.spot_name}</span>
                <span>Language: {lastSentResponse.language}</span>
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
