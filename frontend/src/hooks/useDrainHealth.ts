import useSWR from "swr";
import { api } from "@/lib/api";
import { DrainHealthEntry, DrainHealthDetail } from "@/lib/types";
import { useDisplayDate } from "@/lib/displayDate";

export function useDrainHealth() {
  const [currentDisplayDate] = useDisplayDate();
  const { data, error, isLoading, mutate } = useSWR<DrainHealthEntry[]>(
    ["/api/drain-health", currentDisplayDate],
    () => api.getDrainHealth(currentDisplayDate),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    drains: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export function useDrainHealthDetail(spotId: number | null) {
  const [currentDisplayDate] = useDisplayDate();
  const { data, error, isLoading, mutate } = useSWR<DrainHealthDetail | null>(
    spotId ? ["/api/drain-health", spotId, currentDisplayDate] : null,
    () => (spotId ? api.getDrainHealthDetail(spotId, currentDisplayDate) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    detail: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
