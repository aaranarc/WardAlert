"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSpots } from "@/hooks/useSpots";
import { useAlertsLog } from "@/hooks/useAlertsLog";
import { AlertLog } from "@/components/Alerts/AlertLog";
import { api } from "@/lib/api";
import { IconSend, IconRefresh, IconWarning, IconCheck } from "@/components/Common/Icons";

const AVAILABLE_LANGUAGES: Array<{
  code: "en" | "hi" | "hinglish" | "mr";
  label: string;
  nativeLabel: string;
}> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "hinglish", label: "Hinglish", nativeLabel: "Hinglish" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
];

function AlertsContent() {
  const searchParams = useSearchParams();
  const urlSpotId = searchParams.get("spot_id");

  const { spots } = useSpots();
  const { logs, isLoading, broadcastAlert, isSending, mutate } = useAlertsLog(100);

  // Mode: Normal broadcast (default) vs Critical emergency
  const [mode, setMode] = useState<"normal" | "critical">("normal");

  // Spot selection
  const [selectedSpotId, setSelectedSpotId] = useState<number | "">("");

  // Multi-select languages (default: English)
  const [selectedLangs, setSelectedLangs] = useState<Array<"en" | "hi" | "hinglish" | "mr">>(["en"]);
  const [previewLang, setPreviewLang] = useState<"en" | "hi" | "hinglish" | "mr">("en");

  // Preview state
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshLedger = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await mutate();
      const message = `Ledger refreshed · ${fresh?.length ?? 0} entries`;
      setToastMessage(message);
      setTimeout(() => setToastMessage((prev) => (prev === message ? null : prev)), 4000);
    } catch {
      setFormError("Could not refresh the audit ledger.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize selected spot
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

  // Keep previewLang in sync if selected languages change
  useEffect(() => {
    if (selectedLangs.length > 0 && !selectedLangs.includes(previewLang)) {
      setPreviewLang(selectedLangs[0]);
    }
  }, [selectedLangs, previewLang]);

  const currentSpot = useMemo(() => {
    return spots.find((s) => s.spot_id === Number(selectedSpotId));
  }, [spots, selectedSpotId]);

  // Language chip toggle
  const toggleLanguage = (code: "en" | "hi" | "hinglish" | "mr") => {
    setSelectedLangs((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((l) => l !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  // Generate / Load Preview
  const handleGeneratePreview = async (langToPreview?: "en" | "hi" | "hinglish" | "mr") => {
    const targetLang = langToPreview || previewLang;
    setPreviewLang(targetLang);
    if (!currentSpot) return;

    setIsPreviewLoading(true);
    setFormError(null);

    try {
      const previewRes = await api.getAlertPreview(currentSpot.spot_id, targetLang);
      setPreviewText(previewRes.rendered_message);
    } catch {
      setFormError("Could not generate alert preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Broadcast submit handler
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setToastMessage(null);

    if (!selectedSpotId) {
      setFormError("Please select a target flood spot.");
      return;
    }

    if (selectedLangs.length === 0) {
      setFormError("Please select at least one language template.");
      return;
    }

    const res = await broadcastAlert(Number(selectedSpotId), mode, selectedLangs);
    if (res) {
      const channelSuffix = mode === "critical" ? "WhatsApp + SMS" : "WhatsApp";
      const message = `Broadcast sent to ${res.broadcast_count} subscribers via ${channelSuffix}`;
      setToastMessage(message);

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        setToastMessage((prev) => (prev === message ? null : prev));
      }, 6000);
    } else {
      setFormError("Broadcast failed. Please check network connection or server status.");
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
          <div className="p-1 bg-emerald-800 rounded-full shrink-0">
            <IconCheck className="w-4 h-4 text-white" />
          </div>
          <div className="text-xs font-medium leading-snug">{toastMessage}</div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white text-xs ml-auto font-bold pl-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Civic Alert Dispatch Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ward G-South multilingual emergency dispatch & public notification gateway.
          </p>
        </div>

        <button
          onClick={handleRefreshLedger}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 w-fit disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Refresh audit ledger"
        >
          <IconRefresh className={`w-3.5 h-3.5 text-[#0066cc] ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Broadcast Form (5 of 12) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-5 shadow-xs">
          {/* Segmented Control at Top */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">
              Broadcast Dispatch Mode
            </label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMode("normal")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                  mode === "normal"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Normal broadcast
              </button>
              <button
                type="button"
                onClick={() => setMode("critical")}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === "critical"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    mode === "critical" ? "bg-white animate-ping" : "bg-rose-500"
                  }`}
                />
                Critical emergency
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {mode === "normal"
                ? "Dispatches alert via WhatsApp exclusively to verified subscribers registered for this spot."
                : "Priority Emergency: Dispatches alerts via WhatsApp + SMS to all citizens in 2.0 km radius."}
            </p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            {/* Target Flood Spot Dropdown */}
            <div>
              <label htmlFor="target-spot" className="block text-slate-700 font-medium mb-1">
                Target Flood Spot
              </label>
              <select
                id="target-spot"
                value={selectedSpotId}
                onChange={(e) => {
                  setSelectedSpotId(Number(e.target.value));
                  setPreviewText(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-[#0066cc]"
              >
                {spots.map((spot) => (
                  <option key={spot.spot_id} value={spot.spot_id}>
                    #{spot.spot_id} {spot.name} — {spot.risk_level?.toUpperCase() || "LOW"} (
                    {spot.p_actual !== undefined && spot.p_actual !== null
                      ? `${Math.round(spot.p_actual * 100)}%`
                      : "—"}
                    )
                  </option>
                ))}
              </select>
            </div>

            {/* Language Chips (Multi-select) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-medium">
                  Language Templates (Multi-select)
                </label>
                <span className="text-[10px] text-slate-400">
                  {selectedLangs.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isSelected = selectedLangs.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLanguage(lang.code)}
                      className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-[#e8f2fc] border-[#0066cc] text-[#0066cc] font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <span className="block text-xs">{lang.label}</span>
                        <span className="block text-[10px] opacity-75 font-normal">
                          {lang.nativeLabel}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                          isSelected
                            ? "bg-[#0066cc] border-[#0066cc] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected ? "✓" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipients Note — Replaces phone number input */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>Recipients Source</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 rounded text-slate-700">
                  Subscribers Table
                </span>
              </div>
              <p>
                {mode === "critical"
                  ? "Radius geo-query targets all active citizen subscribers within 2.0 km of the hazard zone."
                  : "Targeted dispatch to registered citizens subscribed to updates for this chronic waterlogging spot."}
              </p>
            </div>

            {/* Preview and Send Action Row */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGeneratePreview()}
                  disabled={isPreviewLoading || !currentSpot}
                  className="w-1/2 py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>{isPreviewLoading ? "Loading..." : "Preview Alert"}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSending || !currentSpot}
                  className={`w-1/2 py-2 px-3 rounded-lg font-semibold text-xs text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs ${
                    mode === "critical"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-[#0066cc] hover:bg-[#0055b3]"
                  }`}
                >
                  <IconSend className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
                  <span>{isSending ? "Broadcasting..." : "Send broadcast"}</span>
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                  <IconWarning className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>
          </form>

          {/* Template Preview Section */}
          {previewText && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-900 uppercase">
                  Alert Message Preview
                </span>
                <div className="flex items-center gap-1">
                  {selectedLangs.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleGeneratePreview(l)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                        previewLang === l
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp Chat Bubble Mockup */}
              <div className="p-3.5 bg-[#efeae2] rounded-lg border border-slate-300/70 shadow-inner">
                <div className="bg-white rounded-lg p-3 shadow-xs border border-emerald-600/20 max-w-sm space-y-1 relative">
                  <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">
                    WhatsApp Message Preview ({previewLang.toUpperCase()})
                  </div>
                  <pre className="font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {previewText}
                  </pre>
                  <div className="text-[9px] text-slate-400 text-right font-mono mt-1">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log Table (7 of 12) */}
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
          Loading civic alerts console...
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
