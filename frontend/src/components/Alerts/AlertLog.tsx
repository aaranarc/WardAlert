"use client";

import React, { useState } from "react";
import { AlertLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Calendar,
  Globe,
  Eye,
  X,
  FileText,
} from "lucide-react";

interface AlertLogProps {
  logs: AlertLogEntry[];
  isLoading: boolean;
}

export function AlertLog({ logs, isLoading }: AlertLogProps) {
  const [activeMessage, setActiveMessage] = useState<AlertLogEntry | null>(null);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "sent") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          SENT
        </span>
      );
    }
    if (s === "simulated") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <CheckCircle2 className="w-3 h-3" />
          SIMULATED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <AlertCircle className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "en":
        return "English (en)";
      case "hi":
        return "Hindi (hi)";
      case "hinglish":
        return "Hinglish";
      case "mr":
        return "Marathi (mr)";
      default:
        return lang;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12122b] border border-[#7B68EE]/20 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-[#7B68EE]/20 bg-[#161638] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#b8a9ff]" />
            <span>Dispatched WhatsApp Audit Log</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time feed of automated multichannel notifications & emergency alerts.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-[#0d0d1a] px-2.5 py-1 rounded-lg border border-[#7B68EE]/20">
          {logs.length} logged events
        </span>
      </div>

      {/* Table / List */}
      <div className="flex-1 overflow-auto">
        {isLoading && logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            Loading alert audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono">
            No alert transmissions recorded yet. Use the form to send a test alert!
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0e0e22] text-slate-400 font-mono text-[11px] sticky top-0 z-10 border-b border-[#7B68EE]/20 select-none">
              <tr>
                <th className="py-2.5 px-3">Sent Timestamp</th>
                <th className="py-2.5 px-3">Flood Spot Target</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Channel & Recipient</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-[#18183c] transition-colors text-slate-300"
                >
                  {/* Timestamp */}
                  <td className="py-3 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(log.sent_at)}
                  </td>

                  {/* Spot Name */}
                  <td className="py-3 px-3 font-sans font-medium text-white">
                    {log.spot_name || (log.spot_id ? `Spot #${log.spot_id}` : "—")}
                  </td>

                  {/* Language */}
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px] border border-slate-700">
                      {getLanguageLabel(log.language)}
                    </span>
                  </td>

                  {/* Channel / Recipient */}
                  <td className="py-3 px-3 hidden sm:table-cell text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="capitalize text-slate-300">{log.channel}</span>
                      {log.recipient && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          ({log.recipient})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">{getStatusBadge(log.status)}</td>

                  {/* View Details Button */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setActiveMessage(log)}
                      className="px-2.5 py-1 rounded bg-[#7B68EE]/20 hover:bg-[#7B68EE]/30 text-[#b8a9ff] hover:text-white text-[11px] font-sans font-medium transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Message Modal */}
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#12122b] border border-[#7B68EE]/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#7B68EE]/20 bg-[#18183e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#b8a9ff]" />
                <h3 className="font-bold text-white text-sm">
                  WhatsApp Payload: {activeMessage.spot_name || `Spot #${activeMessage.spot_id}`}
                </h3>
              </div>
              <button
                onClick={() => setActiveMessage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono p-2.5 rounded-xl bg-[#0a0a0f] border border-slate-800">
                <div className="text-slate-400">
                  Status: {getStatusBadge(activeMessage.status)}
                </div>
                <div className="text-slate-400">
                  Language:{" "}
                  <span className="text-[#b8a9ff] font-bold">
                    {getLanguageLabel(activeMessage.language)}
                  </span>
                </div>
                <div className="text-slate-400">
                  Sent: <span className="text-slate-200">{formatDateTime(activeMessage.sent_at)}</span>
                </div>
              </div>

              {/* WhatsApp message bubble */}
              <div className="bg-[#0b141a] border border-[#233138] rounded-xl p-4 shadow-inner relative">
                <div className="text-[10px] font-mono text-emerald-400 uppercase font-semibold mb-2 flex items-center justify-between">
                  <span>WhatsApp Message Content</span>
                  <span className="text-slate-500">
                    Recipient: {activeMessage.recipient || "+910000000000"}
                  </span>
                </div>
                <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-[#111b21] p-3.5 rounded-lg border border-[#202c33]">
                  {activeMessage.body}
                </pre>
              </div>

              {activeMessage.error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs font-mono text-rose-300">
                  Error: {activeMessage.error}
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-[#161638] flex justify-end">
              <button
                onClick={() => setActiveMessage(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-sans font-medium transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
