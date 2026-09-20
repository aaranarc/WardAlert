"use client";

import React, { useState } from "react";
import { AlertLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { CloseIcon } from "@/components/Icons";

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
        <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
          SENT
        </span>
      );
    }
    if (s === "simulated") {
      return (
        <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
          SIMULATED
        </span>
      );
    }
    return (
      <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
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
    <div className="flex flex-col h-full bg-[#ffffff] border border-[#d4dae3] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#d4dae3] bg-[#f8fafc] flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1a1f2e] font-mono">
            DISPATCHED ALERTS AUDIT LOG
          </h2>
          <p className="text-[11px] text-[#5b6478] mt-0.5">
            Real-time chronological log of emergency flood notifications and citizen broadcasts.
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#5b6478] bg-[#ffffff] px-2 py-0.5 border border-[#d4dae3]">
          {logs.length} logged
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading && logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5b6478] font-mono">
            Loading alert audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5b6478] font-mono">
            No alerts sent yet. Use the dispatch form to transmit a test broadcast.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-[#f1f5f9] text-[#5b6478] text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-[#d4dae3] select-none">
              <tr>
                <th className="py-2 px-2.5">TIMESTAMP (UTC/IST)</th>
                <th className="py-2 px-2.5">SPOT TARGET</th>
                <th className="py-2 px-2.5">LANGUAGE</th>
                <th className="py-2 px-2.5 hidden sm:table-cell">CHANNEL & RECIPIENT</th>
                <th className="py-2 px-2.5">STATUS</th>
                <th className="py-2 px-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-[#f8fafc] transition-colors text-[#1a1f2e]"
                >
                  <td className="py-2 px-2.5 text-[11px] text-[#5b6478] whitespace-nowrap">
                    {formatDateTime(log.sent_at)}
                  </td>

                  <td className="py-2 px-2.5 font-sans font-medium">
                    {log.spot_name || (log.spot_id ? `Spot #${log.spot_id}` : "—")}
                  </td>

                  <td className="py-2 px-2.5">
                    <span className="px-1.5 py-0.2 bg-[#f1f5f9] text-[#1a1f2e] text-[10px] border border-[#d4dae3]">
                      {getLanguageLabel(log.language)}
                    </span>
                  </td>

                  <td className="py-2 px-2.5 hidden sm:table-cell text-[#5b6478] text-[11px]">
                    <span className="capitalize text-[#1a1f2e]">{log.channel}</span>
                    {log.recipient && (
                      <span className="text-[10px] text-[#5b6478] truncate max-w-[140px] ml-1">
                        ({log.recipient})
                      </span>
                    )}
                  </td>

                  <td className="py-2 px-2.5">{getStatusBadge(log.status)}</td>

                  <td className="py-2 px-2.5 text-right">
                    <button
                      onClick={() => setActiveMessage(log)}
                      className="px-2 py-0.5 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f1f5f9] text-[#1a1f2e] text-[10px] font-sans transition-colors"
                    >
                      View Text
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Message Text Modal */}
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-[#ffffff] border border-[#d4dae3] rounded-sm w-full max-w-lg shadow-lg overflow-hidden">
            <div className="p-3 border-b border-[#d4dae3] bg-[#f8fafc] flex items-center justify-between">
              <h3 className="font-bold text-[#1a1f2e] text-xs uppercase font-mono">
                MESSAGE PAYLOAD · {activeMessage.spot_name || `SPOT #${activeMessage.spot_id}`}
              </h3>
              <button
                onClick={() => setActiveMessage(null)}
                className="p-1 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f1f5f9] text-[#1a1f2e] transition-colors"
                aria-label="Close modal"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#f8fafc] border border-[#d4dae3] text-[11px]">
                <div>STATUS: {getStatusBadge(activeMessage.status)}</div>
                <div>LANG: <span className="font-bold">{getLanguageLabel(activeMessage.language)}</span></div>
                <div>SENT: <span className="text-[#5b6478]">{formatDateTime(activeMessage.sent_at)}</span></div>
              </div>

              <div className="bg-[#f8fafc] border border-[#d4dae3] p-3">
                <div className="text-[10px] text-[#5b6478] uppercase font-bold mb-1">
                  TRANSFERRED BODY:
                </div>
                <pre className="font-mono text-xs text-[#1a1f2e] whitespace-pre-wrap leading-relaxed">
                  {activeMessage.body}
                </pre>
              </div>

              {activeMessage.error && (
                <div className="p-2 bg-[#fef2f2] border border-[#fecaca] text-[11px] text-[#b91c1c]">
                  PROVIDER ERROR: {activeMessage.error}
                </div>
              )}
            </div>

            <div className="p-2.5 border-t border-[#d4dae3] bg-[#f8fafc] flex justify-end">
              <button
                onClick={() => setActiveMessage(null)}
                className="px-3 py-1 border border-[#d4dae3] bg-[#ffffff] hover:bg-[#f1f5f9] text-[#1a1f2e] text-xs font-sans"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
