import { useEffect, useRef, useState } from "react";

/**
 * Polls a sensor backend at a fixed interval and returns the latest payload.
 *
 * Expected backend shape (nodes with light + sound):
 *   GET {endpoint} -> {
 *     node1: { light: number, sound: number },
 *     node2: { light: number, sound: number },
 *     ...
 *   }
 *
 * The hook hands back the raw JSON; consumers decide how to combine the
 * per-node fields into a bloom level.
 */
export type SensorNode = { light?: number; sound?: number } & Record<string, number>;
export type SensorPayload = Record<string, SensorNode>;

export type SensorStatus = "idle" | "live" | "error";

const toNum = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};

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

        // Normalize each node's fields to numbers. Tolerate either a nested
        // object ({ node1: { light, sound } }) or a flat shape
        // ({ node1_light, node1_sound }).
        const json: SensorPayload = {};
        for (const [k, v] of Object.entries(raw)) {
          if (v && typeof v === "object" && !Array.isArray(v)) {
            const node: SensorNode = {};
            for (const [fk, fv] of Object.entries(v as Record<string, unknown>)) {
              const n = toNum(fv);
              if (n !== undefined) node[fk] = n;
            }
            json[k] = node;
          } else {
            // flat key like "node1_light"
            const m = /^(node\d+)_(light|sound)$/i.exec(k);
            if (m) {
              const [, nodeKey, field] = m;
              const n = toNum(v);
              if (n !== undefined) {
                json[nodeKey] = { ...(json[nodeKey] ?? {}), [field.toLowerCase()]: n };
              }
            }
          }
        }
        console.log("[Sensor Data]", json);
        if (cancelled.current) return;
        setData(json);
        setStatus("live");
      } catch (err) {
        if (cancelled.current) return;
        setStatus("error");
        console.error("[Sensor Error]", err);
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
