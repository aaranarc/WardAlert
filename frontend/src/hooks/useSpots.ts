import { useRef } from "react";
import useSWR from "swr";
import { api, HERO_TIMESTAMP } from "@/lib/api";
import { SpotRisk } from "@/lib/types";

export function useSpots() {
  const seededRef = useRef(false);

  const fetchSpotsWithSeed = async (): Promise<SpotRisk[]> => {
    if (typeof window !== "undefined") {
      const alreadySeeded = sessionStorage.getItem("wardalert_seeded_hero_2025");
      if (!alreadySeeded && !seededRef.current) {
        seededRef.current = true;
        try {
          // Call POST /api/predict/all with {timestamp: HERO_TIMESTAMP} to seed predictions
          const seededPredictions = await api.predictAll(HERO_TIMESTAMP);
          sessionStorage.setItem("wardalert_seeded_hero_2025", "true");

          const spots = await api.getSpots();
          if (seededPredictions && seededPredictions.length > 0) {
            return spots.map((spot) => {
              const match = seededPredictions.find((p) => p.spot_id === spot.spot_id);
              if (match) {
                return {
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
                };
              }
              return spot;
            });
          }
          return spots;
        } catch (err) {
          console.warn("[useSpots] Error seeding hero predictions:", err);
        }
      }
    }
    return api.getSpots();
  };

  const { data, error, isLoading, mutate } = useSWR<SpotRisk[]>(
    "/api/spots",
    fetchSpotsWithSeed,
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
