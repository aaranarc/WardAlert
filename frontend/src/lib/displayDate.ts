"use client";

import { useSyncExternalStore } from "react";

export const DEFAULT_DISPLAY_DATE = "2025-07-14T10:30:00Z";
export const CLOUDBURST_DATE = "2025-07-14T10:30:00Z";
export const REFRESH_DATE = "2023-07-03T09:00:00Z";

let currentDisplayDate: string = DEFAULT_DISPLAY_DATE;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const saved = sessionStorage.getItem("wardalert_display_date");
  if (saved) {
    currentDisplayDate = saved;
  }
}

export function getDisplayDate(): string {
  return currentDisplayDate;
}

export function setDisplayDate(newDate: string) {
  if (currentDisplayDate !== newDate) {
    currentDisplayDate = newDate;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wardalert_display_date", newDate);
    }
    listeners.forEach((l) => l());
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useDisplayDate(): [string, (date: string) => void] {
  const date = useSyncExternalStore(subscribe, getDisplayDate, () => DEFAULT_DISPLAY_DATE);
  return [date, setDisplayDate];
}
