import useSWR from "swr";
import { api } from "@/lib/api";
import { SpotRisk } from "@/lib/types";
import {
  useDisplayDate,
  DEFAULT_DISPLAY_DATE,
  CLOUDBURST_DATE,
  REFRESH_DATE,
} from "@/lib/displayDate";

export { DEFAULT_DISPLAY_DATE, CLOUDBURST_DATE, REFRESH_DATE };

export function useSpots(overrideDate?: string) {
  const [sharedDisplayDate, setSharedDisplayDate] = useDisplayDate();
  const currentDisplayDate = overrideDate || sharedDisplayDate || DEFAULT_DISPLAY_DATE;

  const fetchSpots = async (): Promise<SpotRisk[]> => {
    try {
      const data = await api.getSpots(currentDisplayDate);
      if (data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn(`[useSpots] Error fetching /api/spots?at=${currentDisplayDate}:`, err);
    }
    try {
      await api.predictAll(currentDisplayDate);
      return await api.getSpots(currentDisplayDate);
    } catch (err) {
      console.warn("[useSpots] Fallback predictAll error:", err);
      return api.getSpots();
    }
  };

  const { data, error, isLoading, mutate } = useSWR<SpotRisk[]>(
    ["/api/spots", currentDisplayDate],
    fetchSpots,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const refreshPredictions = async (): Promise<SpotRisk[] | undefined> => {
    setSharedDisplayDate(REFRESH_DATE);
    return await mutate();
  };

  const replayCloudburst = async (): Promise<SpotRisk[] | undefined> => {
    setSharedDisplayDate(CLOUDBURST_DATE);
    return await mutate();
  };

  return {
    spots: data || [],
    currentDisplayDate,
    activeDate: currentDisplayDate,
    setDisplayDate: setSharedDisplayDate,
    refreshPredictions,
    replayCloudburst,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
