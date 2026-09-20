import useSWR from "swr";
import { api } from "@/lib/api";
import { SpotRisk } from "@/lib/types";

export function useSpots() {
  const { data, error, isLoading, mutate } = useSWR<SpotRisk[]>(
    "/api/spots",
    () => api.getSpots(),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 60000,
    }
  );

  return {
    spots: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
