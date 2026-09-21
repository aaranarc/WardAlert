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

      const alreadySeeded = sessionStorage.getItem("wardalert_seeded_predictions_ready");
      if (!alreadySeeded && !seededRef.current) {
        seededRef.current = true;
        try {
          // Pre-seed both dates so they are instantly ready in DB
          await api.predictAll(HERO_TIMESTAMP);
          await api.predictAll(REFRESH_TIMESTAMP);
          sessionStorage.setItem("wardalert_seeded_predictions_ready", "true");
        } catch (err) {
          console.warn("[useSpots] Error seeding initial predictions:", err);
        }
      }

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
      dedupingInterval: 10000,
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
      const results = await api.predictAll(REFRESH_TIMESTAMP);
      if (results && results.length > 0) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("wardalert_active_timestamp", REFRESH_TIMESTAMP);
        }
        let updatedSpots: SpotRisk[] = [];
        await mutate((current) => {
          const baseList = current && current.length > 0 ? current : results.map((r) => ({
            spot_id: r.spot_id,
            name: r.spot_name,
            lat: 18.99,
            lng: 72.82,
          } as SpotRisk));

          updatedSpots = baseList.map((spot) => {
            const match = results.find((r) => r.spot_id === spot.spot_id);
            return match
              ? {
                  ...spot,
                  p_rain: match.p_rain,
                  p_actual: match.p_actual,
                  delta: match.delta,
                  risk_level: match.risk_level,
                  cause_label: match.cause_label,
                  dispatch_type: match.dispatch_type,
                  confidence_lower: match.confidence_lower,
                  confidence_upper: match.confidence_upper,
                  shap_top3: match.shap_top3,
                  predicted_for: match.predicted_for,
                }
              : spot;
          });
          return updatedSpots;
        }, false);
        return updatedSpots;
      }
    } catch (err) {
      console.error("[useSpots] Error refreshing predictions for 2023-07-03:", err);
    }
    return null;
  };

  const replayCloudburst = async (): Promise<SpotRisk[] | null> => {
    try {
      const results = await api.predictAll(HERO_TIMESTAMP);
      if (results && results.length > 0) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("wardalert_active_timestamp", HERO_TIMESTAMP);
        }
        let updatedSpots: SpotRisk[] = [];
        await mutate((current) => {
          const baseList = current && current.length > 0 ? current : results.map((r) => ({
            spot_id: r.spot_id,
            name: r.spot_name,
            lat: 18.99,
            lng: 72.82,
          } as SpotRisk));

          updatedSpots = baseList.map((spot) => {
            const match = results.find((r) => r.spot_id === spot.spot_id);
            return match
              ? {
                  ...spot,
                  p_rain: match.p_rain,
                  p_actual: match.p_actual,
                  delta: match.delta,
                  risk_level: match.risk_level,
                  cause_label: match.cause_label,
                  dispatch_type: match.dispatch_type,
                  confidence_lower: match.confidence_lower,
                  confidence_upper: match.confidence_upper,
                  shap_top3: match.shap_top3,
                  predicted_for: match.predicted_for,
                }
              : spot;
          });
          return updatedSpots;
        }, false);
        return updatedSpots;
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
