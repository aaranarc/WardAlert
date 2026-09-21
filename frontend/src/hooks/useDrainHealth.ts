import useSWR from "swr";
import { api } from "@/lib/api";
import { DrainHealthEntry, DrainHealthDetail } from "@/lib/types";

export function useDrainHealth() {
  const { data, error, isLoading, mutate } = useSWR<DrainHealthEntry[]>(
    "/api/drain-health",
    () => api.getDrainHealth(),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 60000,
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
  const { data, error, isLoading, mutate } = useSWR<DrainHealthDetail | null>(
    spotId ? `/api/drain-health/${spotId}` : null,
    () => (spotId ? api.getDrainHealthDetail(spotId) : null),
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
