"use client";

import React, { useState } from "react";
import { AlertLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { IconCheck, IconClose } from "@/components/Common/Icons";

interface AlertLogProps {
  logs: AlertLogEntry[];
  isLoading: boolean;
}

export function AlertLog({ logs, isLoading }: AlertLogProps) {
  const [activeMessage, setActiveMessage] = useState<AlertLogEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "whatsapp" | "sms" | "simulated">("all");
  const [search, setSearch] = useState("");

  const counts = React.useMemo(() => {
    return {
      all: logs.length,
      whatsapp: logs.filter((l) => l.channel?.includes("whatsapp")).length,
      sms: logs.filter((l) => l.channel?.includes("sms")).length,
      simulated: logs.filter((l) => l.status?.toLowerCase() === "simulated").length,
    };
  }, [logs]);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((l) => {
      if (filter === "whatsapp" && !l.channel?.includes("whatsapp")) return false;
      if (filter === "sms" && !l.channel?.includes("sms")) return false;
      if (filter === "simulated" && l.status?.toLowerCase() !== "simulated") return false;
      if (search.trim() && !(l.spot_name || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filter, search]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "sent") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <IconCheck className="w-3 h-3" />
          SENT
        </span>
      );
    }
    if (s === "simulated") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-[#0066cc] border border-blue-200">
          SIMULATED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        {status.toUpperCase()}
      </span>
    );
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "en":
        return "English";
      case "hi":
        return "Hindi";
      case "hinglish":
        return "Hinglish";
      case "mr":
        return "Marathi";
      default:
        return lang;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Broadcast Audit Log</h2>
            <p className="text-[11px] text-slate-500">Historical dispatch ledger</p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {filteredLogs.length} of {logs.length} Entries
          </span>
        </div>

        {/* Dynamic Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              filter === "all"
                ? "bg-[#0066cc] text-white shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1 py-0.2 rounded-full ${
              filter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("whatsapp")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              filter === "whatsapp"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
            }`}
          >
            <span>WhatsApp</span>
            <span className={`text-[10px] px-1 py-0.2 rounded-full ${
              filter === "whatsapp" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
            }`}>
              {counts.whatsapp}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("sms")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              filter === "sms"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
            }`}
          >
            <span>SMS</span>
            <span className={`text-[10px] px-1 py-0.2 rounded-full ${
              filter === "sms" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
            }`}>
              {counts.sms}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("simulated")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              filter === "simulated"
                ? "bg-slate-800 text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>Simulated</span>
            <span className={`text-[10px] px-1 py-0.2 rounded-full ${
              filter === "simulated" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts.simulated}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[320px]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading broadcast history...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No alerts found matching filter.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 uppercase font-semibold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Spot</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Recipients</th>
                <th className="py-2.5 px-3 text-right">Dispatched</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[140px]">
                    {log.spot_name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-medium">
                    {getLanguageLabel(log.language)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {log.recipient_count || 1}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                    {formatDateTime(log.dispatched_at)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setActiveMessage(log)}
                      className="text-[11px] text-[#0066cc] font-medium hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Message Inspection Modal */}
      {activeMessage && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900">
                Dispatch Payload ({activeMessage.spot_name})
              </h3>
              <button
                onClick={() => setActiveMessage(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {activeMessage.body}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Status: {activeMessage.status}</span>
              <button
                onClick={() => setActiveMessage(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
