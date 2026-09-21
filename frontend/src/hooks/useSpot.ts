import useSWR from "swr";
import { api } from "@/lib/api";
import { SpotDetail } from "@/lib/types";

export function useSpot(spotId: number | null, historyHours: number = 24) {
  const { data, error, isLoading, mutate } = useSWR<SpotDetail | null>(
    spotId ? `/api/spots/${spotId}?history_hours=${historyHours}` : null,
    () => (spotId ? api.getSpot(spotId, historyHours) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    spot: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
