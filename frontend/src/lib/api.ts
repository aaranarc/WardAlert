import {
  SpotRisk,
  SpotDetail,
  PredictRequest,
  PredictionResponse,
  DrainHealthEntry,
  DrainHealthDetail,
  AlertRequest,
  AlertResponse,
  AlertLogEntry,
  BroadcastResponse,
  HealthResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      let parsedError: unknown = errorBody;
      try {
        parsedError = JSON.parse(errorBody);
      } catch {
        // use raw string
      }
      console.warn(`[API] Error from ${endpoint} (status ${res.status}):`, parsedError);
      throw new ApiError(
        `API request failed with status ${res.status}`,
        res.status,
        parsedError
      );
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.warn(`[API] Network or parsing error on ${endpoint}:`, err);
    throw err;
  }
}

export const HERO_TIMESTAMP = "2025-07-15T10:30:00Z";

// API methods
export const api = {
  getHealth: () => fetcher<HealthResponse>("/api/health"),
  getSpots: () => fetcher<SpotRisk[]>("/api/spots"),
  getSpot: (id: number, historyHours: number = 24) =>
    fetcher<SpotDetail>(`/api/spots/${id}?history_hours=${historyHours}`),
  predict: (payload: PredictRequest) => {
    const timestamp = payload.timestamp || HERO_TIMESTAMP;
    return fetcher<PredictionResponse>("/api/predict", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        timestamp,
      }),
    });
  },
  predictAll: (timestamp?: string) => {
    const ts = timestamp || HERO_TIMESTAMP;
    return fetcher<PredictionResponse[]>("/api/predict/all", {
      method: "POST",
      body: JSON.stringify({ timestamp: ts }),
    });
  },
  getDrainHealth: () => fetcher<DrainHealthEntry[]>("/api/drain-health"),
  getDrainHealthDetail: (spotId: number) =>
    fetcher<DrainHealthDetail>(`/api/drain-health/${spotId}`),
  getAlertsLog: (limit: number = 50) =>
    fetcher<AlertLogEntry[]>(`/api/alerts/log?limit=${limit}`),
  sendAlert: (payload: AlertRequest) =>
    fetcher<AlertResponse>("/api/alert/send", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  broadcast: (spotId: number, mode: "normal" | "critical" = "normal", langs?: string[]) =>
    fetcher<BroadcastResponse>(`/api/alert/broadcast/${spotId}?mode=${mode}`, {
      method: "POST",
      body: JSON.stringify({ mode, langs }),
    }),
  getAlertPreview: (spotId: number, lang: string) =>
    fetcher<{ rendered_message: string }>(`/api/alert/preview/${spotId}?lang=${lang}`),
};
