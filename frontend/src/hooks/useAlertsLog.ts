import useSWR from "swr";
import { useState } from "react";
import { api } from "@/lib/api";
import { AlertLogEntry, BroadcastResponse } from "@/lib/types";

export function useAlertsLog(limit: number = 50) {
  const { data, error, isLoading, mutate } = useSWR<AlertLogEntry[]>(
    `/api/alerts/log?limit=${limit}`,
    () => api.getAlertsLog(limit),
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<unknown | null>(null);

  const broadcast = async (spotId: number): Promise<BroadcastResponse | null> => {
    setIsSending(true);
    setSendError(null);
    try {
      const res = await api.broadcast(spotId);
      mutate();
      return res;
    } catch (err) {
      setSendError(err);
      return null;
    } finally {
      setIsSending(false);
    }
  };

  return {
    logs: data || [],
    isLoading,
    isError: !!error,
    error,
    broadcast,
    isSending,
    sendError,
    mutate,
  };
}
