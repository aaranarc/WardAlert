import useSWR from "swr";
import { api } from "@/lib/api";
import { SubscriberCount } from "@/lib/types";

export function useSubscriberCount(spotId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<SubscriberCount | null>(
    spotId ? `/api/spots/${spotId}/subscriber-count` : null,
    () => (spotId ? api.getSubscriberCount(spotId) : null),
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
    }
  );

  return {
    count: data?.count ?? null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
