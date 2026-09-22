"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSpots } from "@/hooks/useSpots";
import { useAlertsLog } from "@/hooks/useAlertsLog";
import { useSubscriberCount } from "@/hooks/useSubscriberCount";
import { AlertLog } from "@/components/Alerts/AlertLog";
import { AlertResponse } from "@/lib/types";
import { api } from "@/lib/api";
import { IconSend, IconRefresh, IconCheck, IconWarning, IconLayers, IconCamera, IconClose } from "@/components/Common/Icons";

function AlertsContent() {
  const searchParams = useSearchParams();
  const urlSpotId = searchParams.get("spot_id");

  const { spots } = useSpots();
  const { logs, isLoading, sendAlert, isSending, mutate } = useAlertsLog(100);

  const [selectedSpotId, setSelectedSpotId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"broadcast" | "simulator" | "direct">("broadcast");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "hinglish" | "mr">("en");

  // Broadcast State
  const [broadcastMode, setBroadcastMode] = useState<"normal" | "critical">("normal");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    broadcast_count: number;
    mode: string;
    channels: string[];
    message: string;
    sample_payload?: string;
  } | null>(null);

  // Direct Send State
  const [recipient, setRecipient] = useState<string>("whatsapp:+919876543210");
  const [lastSentResponse, setLastSentResponse] = useState<AlertResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inbound Webhook Simulator State
  const [simPhoneNumber, setSimPhoneNumber] = useState<string>("+919876543210");
  const [simBody, setSimBody] = useState<string>("STATUS");
  const [simIsLoading, setSimIsLoading] = useState<boolean>(false);
  const [simResponse, setSimResponse] = useState<any>(null);

  // Photo Submission Modal State (Citizen WhatsApp Bot Demo Stub)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<{
    spotName: string;
    riskPct: number;
    tier: "CRITICAL" | "HIGH RISK";
    oldCount: number;
    newCount: number;
  } | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Live subscriber counts from API
  const { subscriberData, mutate: mutateSubscriberCount } = useSubscriberCount(selectedSpotId);

  useEffect(() => {
    if (urlSpotId) {
      const parsed = parseInt(urlSpotId, 10);
      if (!isNaN(parsed)) {
        setSelectedSpotId(parsed);
      }
    } else if (spots.length > 0 && !selectedSpotId) {
      setSelectedSpotId(spots[0].spot_id);
    }
  }, [urlSpotId, spots, selectedSpotId]);

  const currentSpot = spots.find((s) => s.spot_id === selectedSpotId) || spots[0];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([mutate(), mutateSubscriberCount()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleClosePhotoModal = () => {
    setIsPhotoModalOpen(false);
    if (uploadedPhotoUrl) {
      URL.revokeObjectURL(uploadedPhotoUrl);
      setUploadedPhotoUrl(null);
    }
    setPhotoAnalysisResult(null);
    setIsAnalyzingPhoto(false);
    if (photoFileInputRef.current) {
      photoFileInputRef.current.value = "";
    }
  };

  const handlePhotoFileSelect = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    if (uploadedPhotoUrl) {
      URL.revokeObjectURL(uploadedPhotoUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setUploadedPhotoUrl(previewUrl);
    setIsAnalyzingPhoto(true);
    setPhotoAnalysisResult(null);

    // Dynamic logic: spot name read from currently selected spot at upload time
    const spotName = currentSpot?.name || "Selected Hotspot";

    // Random risk percentage between 60 and 85, computed ONCE per upload
    const riskPct = Math.floor(60 + Math.random() * 26); // 60-85 inclusive

    // Tier based on risk
    const tier: "CRITICAL" | "HIGH RISK" = riskPct >= 80 ? "CRITICAL" : "HIGH RISK";

    // Fake current crowd count -> +1 after submission
    const oldCount = 8 + Math.floor(Math.random() * 8); // 8-15
    const newCount = oldCount + 1;

    setTimeout(() => {
      setPhotoAnalysisResult({
        spotName,
        riskPct,
        tier,
        oldCount,
        newCount,
      });
      setIsAnalyzingPhoto(false);
    }, 1000);
  };

  // 1. Municipal Outbound Broadcast
  const handleBroadcast = async () => {
    if (!selectedSpotId) return;
    setIsBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await api.broadcastAlert(selectedSpotId, {
        mode: broadcastMode,
        language: selectedLanguage,
      });
      setBroadcastResult(res);
      await mutate();
      await mutateSubscriberCount();
    } catch (err: any) {
      setBroadcastResult({
        broadcast_count: 0,
        mode: broadcastMode,
        channels: ["whatsapp"],
        message: err?.message || "Failed to trigger broadcast.",
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  // 2. Direct Test Send
  const handleDirectSend = async (e: React.FormEvent) => {
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

  // 3. Citizen Inbound Webhook Simulator (Location Pin, STATUS, EXTEND, STOP)
  const handleSimulateInbound = async (actionType: "location" | "status" | "extend" | "stop" | "custom") => {
    setSimIsLoading(true);
    setSimResponse(null);
    try {
      let payload: any = { From: simPhoneNumber };

      if (actionType === "location") {
        payload.Latitude = currentSpot ? currentSpot.lat : 19.010;
        payload.Longitude = currentSpot ? currentSpot.lng : 72.842;
      } else if (actionType === "status") {
        payload.Body = "STATUS";
      } else if (actionType === "extend") {
        payload.Body = "EXTEND";
      } else if (actionType === "stop") {
        payload.Body = "STOP";
      } else {
        payload.Body = simBody;
      }

      const res = await api.simulateWhatsAppWebhook(payload);
      setSimResponse(res);
      await mutate();
      await mutateSubscriberCount();
    } catch (err: any) {
      setSimResponse({
        success: false,
        reply_message: err?.message || "Webhook simulation failed.",
      });
    } finally {
      setSimIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafc] p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Emergency Alert & WhatsApp Dispatch System
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Twilio WhatsApp inbound citizen bot, municipal radius broadcasts, and immutable audit ledger.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 w-fit disabled:opacity-75"
          aria-label="Refresh logs"
        >
          <IconRefresh className={`w-3.5 h-3.5 text-[#0066cc] ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Ledger"}</span>
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Interactive Dispatch Controls (5 of 12) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
          {/* Target Flood Spot Selector & Live Subscriber Counters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="target-spot" className="block text-xs font-bold text-slate-900">
                Target Flood Hotspot
              </label>
              {subscriberData && (
                <span className="text-[10px] font-mono text-[#0066cc] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {subscriberData.spot_subscribers} local / {subscriberData.radius_subscribers} in 2km
                </span>
              )}
            </div>

            <select
              id="target-spot"
              value={selectedSpotId}
              onChange={(e) => setSelectedSpotId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0066cc]"
            >
              {spots.map((spot) => (
                <option key={spot.spot_id} value={spot.spot_id}>
                  #{spot.spot_id} {spot.name} ({spot.risk_level || "low"} risk)
                </option>
              ))}
            </select>
          </div>

          {/* Tab Switcher: Municipal Broadcast vs Citizen Simulator vs Direct Send */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab("broadcast")}
              className={`pb-2 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "broadcast"
                  ? "border-[#0066cc] text-[#0066cc]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Municipal Broadcast
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("simulator")}
              className={`pb-2 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "simulator"
                  ? "border-[#0066cc] text-[#0066cc]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Citizen WhatsApp Bot
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("direct")}
              className={`pb-2 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === "direct"
                  ? "border-[#0066cc] text-[#0066cc]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Single Test Send
            </button>
          </div>

          {/* TAB 1: MUNICIPAL OUTBOUND BROADCAST (Section 2.3 of whatsapp.md) */}
          {activeTab === "broadcast" && (
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="block font-medium text-slate-700 mb-1.5">Broadcast Scope</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastMode("normal")}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      broadcastMode === "normal"
                        ? "bg-[#e8f2fc] border-[#0066cc] text-[#0066cc] font-semibold ring-1 ring-[#0066cc]"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-semibold text-xs">Spot Subscribers</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {subscriberData?.spot_subscribers || 0} registered citizens
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastMode("critical")}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      broadcastMode === "critical"
                        ? "bg-rose-50 border-rose-500 text-rose-700 font-semibold ring-1 ring-rose-400"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-semibold text-xs text-rose-700">Critical 2.0 km Radius</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {subscriberData?.radius_subscribers || 0} nearby citizens
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <span className="block font-medium text-slate-700 mb-1">Language Template</span>
                <div className="grid grid-cols-4 gap-1.5">
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
                      className={`py-1.5 px-2 rounded-md text-center border text-[11px] font-medium transition-colors ${
                        selectedLanguage === l.code
                          ? "bg-[#0066cc] text-white border-[#0066cc]"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>Target Spot:</span>
                  <span className="font-semibold text-slate-900">{currentSpot?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Channels:</span>
                  <span className="font-mono text-slate-800">
                    {broadcastMode === "critical" ? "WhatsApp + SMS Fallback" : "WhatsApp"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Reach:</span>
                  <span className="font-mono font-bold text-[#0066cc]">
                    {broadcastMode === "critical"
                      ? `${subscriberData?.radius_subscribers || 0} citizens`
                      : `${subscriberData?.spot_subscribers || 0} citizens`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                className="w-full py-2 px-4 rounded-lg bg-[#0066cc] hover:bg-[#0055b3] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <IconSend className={`w-3.5 h-3.5 ${isBroadcasting ? "animate-spin" : ""}`} />
                <span>
                  {isBroadcasting
                    ? "Dispatching broadcast..."
                    : broadcastMode === "critical"
                    ? "Trigger Emergency Radius Broadcast (2km)"
                    : `Broadcast to ${subscriberData?.spot_subscribers || 0} Spot Subscribers`}
                </span>
              </button>

              {broadcastResult && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <IconCheck className="w-4 h-4" />
                    <span>{broadcastResult.message}</span>
                  </div>
                  {broadcastResult.sample_payload && (
                    <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {broadcastResult.sample_payload}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CITIZEN WHATSAPP BOT SIMULATOR (Section 2.2 of whatsapp.md) */}
          {activeTab === "simulator" && (
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="block font-medium text-slate-700 mb-1">Simulate Citizen Inbound Action</span>
                <p className="text-[11px] text-slate-500 mb-2">
                  Test how the Twilio webhook responds when citizens interact with the WardAlert WhatsApp bot.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateInbound("location")}
                    disabled={simIsLoading}
                    className="p-2.5 rounded-lg text-left bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 transition-colors"
                  >
                    <div className="font-semibold text-xs">📍 Share Location Pin</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      Nearest spot match & 7d subscribe
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateInbound("status")}
                    disabled={simIsLoading}
                    className="p-2.5 rounded-lg text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0066cc] transition-colors"
                  >
                    <div className="font-semibold text-xs">STATUS Command</div>
                    <div className="text-[10px] text-blue-700 mt-0.5">
                      Fetch live risk & rain telemetry
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateInbound("extend")}
                    disabled={simIsLoading}
                    className="p-2.5 rounded-lg text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors"
                  >
                    <div className="font-semibold text-xs">EXTEND Command</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Renew subscription for 7 days
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateInbound("stop")}
                    disabled={simIsLoading}
                    className="p-2.5 rounded-lg text-left bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 transition-colors"
                  >
                    <div className="font-semibold text-xs">STOP Command</div>
                    <div className="text-[10px] text-rose-600 mt-0.5">
                      Unsubscribe & delete record
                    </div>
                  </button>

                  {/* 5th Card: Demo-Only Citizen Photo Submission */}
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="col-span-2 p-2.5 rounded-lg text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors flex items-start gap-2.5"
                  >
                    <div className="p-1 rounded bg-amber-100/90 text-amber-800 shrink-0 mt-0.5">
                      <IconCamera className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span>Upload Flood Photo</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-800 uppercase tracking-wide">
                          Demo
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-700 mt-0.5">
                        Citizen crowd-report submission
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Switch Command simulation */}
              <div>
                <span className="block font-medium text-slate-700 mb-1">Language Keywords</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: "Hindi", val: "hindi" },
                    { label: "Marathi", val: "marathi" },
                    { label: "Hinglish", val: "hinglish" },
                    { label: "English", val: "english" },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => {
                        setSimBody(btn.val);
                        handleSimulateInbound("custom");
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                    >
                      "{btn.val}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot WhatsApp Response Bubble */}
              {simResponse && (
                <div className="p-3 bg-[#e8f2fc] border border-[#0066cc]/30 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#0066cc] font-semibold">
                    <span>WhatsApp Bot Reply (TwiML / JSON)</span>
                    {simResponse.distance_m && (
                      <span className="font-mono text-[10px]">
                        Matched {simResponse.spot?.name} ({simResponse.distance_m}m)
                      </span>
                    )}
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap shadow-2xs leading-relaxed">
                    {simResponse.reply_message || JSON.stringify(simResponse, null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SINGLE DIRECT TEST DISPATCH */}
          {activeTab === "direct" && (
            <form onSubmit={handleDirectSend} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Language Template</label>
                <div className="grid grid-cols-4 gap-1.5">
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
                      className={`py-1.5 px-2 rounded-md text-center border text-[11px] font-medium transition-colors ${
                        selectedLanguage === l.code
                          ? "bg-[#0066cc] text-white border-[#0066cc]"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>

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
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-2 px-4 rounded-lg bg-[#0066cc] hover:bg-[#0055b3] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <IconSend className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
                <span>{isSending ? "Dispatching..." : "Send Test Alert"}</span>
              </button>

              {lastSentResponse && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs">Dispatch Simulated</span>
                    <span className="text-[10px] text-slate-400 font-mono">{lastSentResponse.sent_at}</span>
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
            </form>
          )}
        </div>

        {/* Audit Log Table Column (7 of 12) */}
        <div className="lg:col-span-7">
          <AlertLog logs={logs} isLoading={isLoading} />
        </div>
      </div>

      {/* CITIZEN PHOTO SUBMISSION DEMO MODAL */}
      {isPhotoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleClosePhotoModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(true);
            }}
            onDragLeave={() => setIsDraggingPhoto(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handlePhotoFileSelect(file);
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClosePhotoModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <IconClose className="w-4 h-4" />
            </button>

            {/* Hidden File Input */}
            <input
              ref={photoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoFileSelect(file);
              }}
            />

            {/* Heading & Sub-line */}
            <div className="mb-4 pr-6">
              <h3 className="text-base font-bold text-slate-900">
                Simulate Citizen Photo Submission
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload any image to see the flow.
              </p>
            </div>

            {/* Upload Area / Drop Zone (when no photo or as drop target) */}
            {!uploadedPhotoUrl ? (
              <div
                onClick={() => photoFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDraggingPhoto
                    ? "border-amber-500 bg-amber-50/60"
                    : "border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/20"
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                  <IconCamera className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  Click or drag to upload photo
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports PNG, JPG, or WEBP (simulates citizen WhatsApp intake)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {/* Left Column: Thumbnail */}
                  <div className="w-full sm:w-36 shrink-0 flex flex-col items-center">
                    <div className="w-32 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-xs relative">
                      <img
                        src={uploadedPhotoUrl}
                        alt="Citizen submission preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-400 text-center mt-1.5 leading-tight">
                      Sample image — real citizen submissions in production
                    </span>
                    <button
                      type="button"
                      onClick={() => photoFileInputRef.current?.click()}
                      className="mt-2.5 px-2.5 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors w-full text-center"
                    >
                      Upload another
                    </button>
                  </div>

                  {/* Right Column: Spinner or Result Card */}
                  <div className="flex-1 w-full min-h-[160px] flex flex-col justify-center">
                    {isAnalyzingPhoto && (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-2.5">
                        <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium text-slate-600 animate-pulse">
                          Analyzing photo...
                        </span>
                      </div>
                    )}

                    {!isAnalyzingPhoto && photoAnalysisResult && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs shadow-xs">
                        {/* Status lines */}
                        <div className="space-y-1 text-slate-700">
                          <div className="flex items-center gap-1.5 font-medium text-emerald-800 text-[11px]">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>
                              Photo received — <strong className="font-semibold text-slate-900">{photoAnalysisResult.spotName}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-800 text-[11px]">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Location matched (240m radius)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-800 text-[11px]">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>Crowd report logged to database</span>
                          </div>
                        </div>

                        {/* Nearest Flood Spot Risk & Progress Bar */}
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-slate-700">Nearest Flood Spot Risk:</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                photoAnalysisResult.tier === "CRITICAL"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {photoAnalysisResult.riskPct}% {photoAnalysisResult.tier}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                photoAnalysisResult.tier === "CRITICAL" ? "bg-rose-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${photoAnalysisResult.riskPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Model B updated */}
                        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                          <div className="font-semibold flex items-center gap-1 text-amber-800">
                            <span>⚠</span>
                            <span>Model B updated:</span>
                          </div>
                          <div className="pl-3.5 space-y-0.5 text-slate-700">
                            <div>crowd_report_count for {photoAnalysisResult.spotName}:</div>
                            <div className="font-mono font-semibold text-slate-900">
                              {photoAnalysisResult.oldCount} → {photoAnalysisResult.newCount}
                            </div>
                          </div>
                        </div>

                        {/* Subscribers alerted */}
                        <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5 pt-1 border-t border-slate-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          <span>Nearby subscribers alerted via WhatsApp</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Below the result, italic grey disclosure */}
                <p className="text-[10px] text-slate-400 italic text-center pt-2 border-t border-slate-100">
                  Demo submission — full photo intake pipeline (media webhook → location match → crowd_reports insert → Model B feature update on next retrain) ships Phase 2.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
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
