import { useState } from "react";
import { api } from "@/lib/api";
import { PredictionResponse } from "@/lib/types";

export function usePredict() {
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const predict = async (spotId: number, timestamp?: string): Promise<PredictionResponse | null> => {
    setIsPredicting(true);
    setError(null);
    try {
      const res = await api.predict({ spot_id: spotId, timestamp: timestamp || null });
      return res;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsPredicting(false);
    }
  };

  const predictAll = async (timestamp?: string): Promise<PredictionResponse[] | null> => {
    setIsPredicting(true);
    setError(null);
    try {
      const res = await api.predictAll(timestamp);
      return res;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsPredicting(false);
    }
  };

  return {
    predict,
    predictAll,
    isPredicting,
    error,
  };
}
