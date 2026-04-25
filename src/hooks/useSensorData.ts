import { useEffect, useRef, useState } from "react";

/**
 * Polls a sensor backend at a fixed interval and returns the latest payload.
 *
 * Expected backend shape (matches the snippet you provided):
 *   GET {endpoint}  ->  { s1: number, s2: number, ... }   // values 0..100
 *
 * The hook is intentionally generic: it just hands back whatever JSON the
 * server returns, so you can map any number of sensor keys to flowers.
 */
export type SensorPayload = Record<string, number>;

export type SensorStatus = "idle" | "live" | "error";

export function useSensorData(endpoint: string, intervalMs = 2000) {
  const [data, setData] = useState<SensorPayload | null>(null);
  const [status, setStatus] = useState<SensorStatus>("idle");
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    const fetchOnce = async () => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = (await res.json()) as Record<string, unknown>;
        // Backend may return values as strings (e.g. "94"). Normalize to numbers
        // so consumers can rely on `typeof value === "number"`.
        const json: SensorPayload = {};
        for (const [k, v] of Object.entries(raw)) {
          const n = typeof v === "number" ? v : parseFloat(String(v));
          if (Number.isFinite(n)) json[k] = n;
        }
        console.log("[Sensor Data]", json); // Log sensor values to console
        if (cancelled.current) return;
        setData(json);
        setStatus("live");
      } catch (err) {
        if (cancelled.current) return;
        setStatus("error");
        console.error("[Sensor Error]", err); // Log errors too
        // Keep last known data so flowers don't reset on a transient blip.
      }
    };

    fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);

    return () => {
      cancelled.current = true;
      clearInterval(id);
    };
  }, [endpoint, intervalMs]);

  return { data, status };
}
