import { useRef } from "react";
import useSWR from "swr";
import { api, HERO_TIMESTAMP, REFRESH_TIMESTAMP } from "@/lib/api";
import { SpotRisk } from "@/lib/types";

export { HERO_TIMESTAMP, REFRESH_TIMESTAMP };

export function useSpots() {
  const seededRef = useRef(false);

  const fetchSpotsWithSeed = async (): Promise<SpotRisk[]> => {
    if (typeof window !== "undefined") {
      const activeTimestamp = sessionStorage.getItem("wardalert_active_timestamp") || HERO_TIMESTAMP;
      try {
        const storedSpots = await api.getSpots(activeTimestamp);
        if (storedSpots && storedSpots.length > 0 && storedSpots[0].predicted_for) {
          return storedSpots;
        }
      } catch (err) {
        console.warn("[useSpots] Error fetching spots for active timestamp:", err);
      }
    }
    return api.getSpots(HERO_TIMESTAMP);
  };

  const { data, error, isLoading, mutate } = useSWR<SpotRisk[]>(
    "/api/spots",
    fetchSpotsWithSeed,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const activeDate =
    data && data.length > 0 && data[0].predicted_for
      ? data[0].predicted_for
      : typeof window !== "undefined"
      ? sessionStorage.getItem("wardalert_active_timestamp") || HERO_TIMESTAMP
      : HERO_TIMESTAMP;

  const refreshPredictions = async (): Promise<SpotRisk[] | null> => {
    try {
      const currentTs =
        data && data.length > 0 && data[0].predicted_for
          ? data[0].predicted_for
          : typeof window !== "undefined"
          ? sessionStorage.getItem("wardalert_active_timestamp")
          : null;

      // Always pick a DIFFERENT real random historical timestamp from the DB
      const freshSpots = await api.getSpots("random", currentTs || undefined);
      if (freshSpots && freshSpots.length > 0) {
        const chosenTs = freshSpots[0].predicted_for;
        if (typeof window !== "undefined" && chosenTs) {
          sessionStorage.setItem("wardalert_active_timestamp", chosenTs);
        }
        await mutate(freshSpots, false);
        return freshSpots;
      }
    } catch (err) {
      console.error("[useSpots] Error refreshing random historical predictions:", err);
    }
    return null;
  };

  const replayCloudburst = async (): Promise<SpotRisk[] | null> => {
    try {
      const spots2025 = await api.getSpots(HERO_TIMESTAMP);
      if (spots2025 && spots2025.length > 0) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("wardalert_active_timestamp", HERO_TIMESTAMP);
        }
        await mutate(spots2025, false);
        return spots2025;
      }
    } catch (err) {
      console.error("[useSpots] Error replaying 2025 cloudburst:", err);
    }
    return null;
  };

  return {
    spots: data || [],
    activeDate,
    isLoading,
    isError: !!error,
    error,
    mutate,
    refreshPredictions,
    replayCloudburst,
  };
}
