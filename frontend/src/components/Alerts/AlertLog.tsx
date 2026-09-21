"use client";

import React, { useState, useMemo } from "react";
import { AlertLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { IconCheck, IconClose } from "@/components/Common/Icons";

interface AlertLogProps {
  logs: AlertLogEntry[];
  isLoading: boolean;
}

export function maskRecipient(recipient: string | null | undefined): string {
  if (!recipient) return "—";
  const clean = recipient.replace(/^whatsapp:/, "");
  // If it's a 32+ character hex hash, mask to +91 ••••• <last 4>
  if (/^[a-f0-9]{32,}$/i.test(clean)) {
    return `+91 ••••• ${clean.slice(-4)}`;
  }
  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `+91 ••••• ${digits.slice(-4)}`;
  }
  return "+91 ••••• 4325";
}

export function AlertLog({ logs, isLoading }: AlertLogProps) {
  const [showErrors, setShowErrors] = useState(false);
  const [activeMessage, setActiveMessage] = useState<AlertLogEntry | null>(null);

  // Filter FAILED by default unless showErrors is checked
  const filteredLogs = useMemo(() => {
    if (showErrors) return logs;
    return logs.filter((l) => l.status.toLowerCase() !== "failed");
  }, [logs, showErrors]);

  const failedCount = useMemo(() => {
    return logs.filter((l) => l.status.toLowerCase() === "failed").length;
  }, [logs]);

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
        FAILED
      </span>
    );
  };

  // Broadcast rows carry every language rendered, comma-separated.
  const getLanguageLabel = (lang: string) =>
    lang.split(",").map(getSingleLanguageLabel).join(", ");

  const getSingleLanguageLabel = (lang: string) => {
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
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xs font-bold text-slate-900">Broadcast Audit Log</h2>
          <p className="text-[11px] text-slate-500">Historical dispatch ledger (SWR 30s)</p>
        </div>

        {/* Show Errors Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none bg-white px-2 py-1 rounded-md border border-slate-200">
            <input
              type="checkbox"
              checked={showErrors}
              onChange={(e) => setShowErrors(e.target.checked)}
              className="rounded text-[#0066cc] focus:ring-0 w-3.5 h-3.5"
            />
            <span className="text-[11px] font-medium">Show errors</span>
            {failedCount > 0 && (
              <span className="text-[10px] font-mono px-1 rounded bg-rose-100 text-rose-700">
                {failedCount}
              </span>
            )}
          </label>
          <span className="text-[10px] font-mono text-slate-400">
            {filteredLogs.length} entries
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[320px]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading broadcast history...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {logs.length > 0 && !showErrors
              ? "All recent broadcasts are error logs (toggle 'Show errors' above to inspect)."
              : "No alerts dispatched yet."}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 uppercase font-semibold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Spot</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3 text-right">Recipients</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Dispatched</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[130px]">
                    {log.spot_name || `Spot #${log.spot_id}`}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-medium">
                    {getLanguageLabel(log.language)}
                  </td>
                  <td className="py-2.5 px-3 font-mono uppercase text-[10px] text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {log.channel || "whatsapp"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {maskRecipient(log.recipient)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-700">
                    {log.recipient_count ?? "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                    {formatDateTime(log.sent_at)}
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
                Dispatch Payload ({activeMessage.spot_name || `Spot #${activeMessage.spot_id}`})
              </h3>
              <button
                onClick={() => setActiveMessage(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <div>Recipient: <span className="font-mono text-slate-800">{maskRecipient(activeMessage.recipient)}</span></div>
              <div>Channel: <span className="font-mono uppercase text-slate-800">{activeMessage.channel || "whatsapp"}</span></div>
              {activeMessage.error && (
                <div className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 font-mono text-[11px]">
                  Error: {activeMessage.error}
                </div>
              )}
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
