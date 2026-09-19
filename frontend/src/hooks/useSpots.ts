import useSWR from "swr";
import { api } from "@/lib/api";
import { SpotRisk } from "@/lib/types";

export function useSpots() {
  const { data, error, isLoading, mutate } = useSWR<SpotRisk[]>(
    "/api/spots",
    () => api.getSpots(),
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
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
