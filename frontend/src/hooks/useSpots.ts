import useSWR, { mutate as globalMutate } from "swr";
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
    try {
      // Pick a random historical prediction from the database, distinct from current date
      const freshSpots = await api.getSpots("random", currentDisplayDate);
      if (freshSpots && freshSpots.length > 0 && freshSpots[0].predicted_for) {
        const chosenTs = freshSpots[0].predicted_for;
        await globalMutate(["/api/spots", chosenTs], freshSpots, false);
        setSharedDisplayDate(chosenTs);
        return freshSpots;
      }
    } catch (err) {
      console.error("[useSpots] Error refreshing random historical predictions:", err);
    }
    setSharedDisplayDate(REFRESH_DATE);
    return await mutate();
  };

  const replayCloudburst = async (): Promise<SpotRisk[] | undefined> => {
    setSharedDisplayDate(CLOUDBURST_DATE);
    try {
      const spots2025 = await api.getSpots(CLOUDBURST_DATE);
      if (spots2025 && spots2025.length > 0) {
        await globalMutate(["/api/spots", CLOUDBURST_DATE], spots2025, false);
        return spots2025;
      }
    } catch (err) {
      console.error("[useSpots] Error replaying cloudburst:", err);
    }
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
