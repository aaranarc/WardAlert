import useSWR from "swr";
import { api } from "@/lib/api";

export function useSubscriberCount(spotId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    spotId ? `/api/subscribers/count/${spotId}` : null,
    () => (spotId ? api.getSubscribersCount(spotId) : null),
    {
      revalidateOnFocus: true,
      refreshInterval: 15000,
    }
  );

  return {
    subscriberData: data,
    isLoading,
    isError: !!error,
    mutate,
  };
}
