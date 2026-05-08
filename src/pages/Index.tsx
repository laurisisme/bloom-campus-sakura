import { useEffect, useRef, useState } from "react";
import campusMap from "@/assets/campus-map.jpg";
import Flower from "@/components/Flower";
import { useSensorData } from "@/hooks/useSensorData";

/**
 * 🔌 SENSOR BACKEND
 * Replace this URL with your real endpoint when ready.
 * The backend is expected to return JSON like: { s1: 72, s2: 41, ... }
 * where each value is a bloom level between 0 and 100.
 */
const SENSOR_ENDPOINT = "https://blooming-dku.onrender.com/data";
const POLL_INTERVAL_MS = 2000;

// Building positions as percentages of the map image (x, y).
// `sensorKey` maps a building to a key in the backend JSON payload.
// Buildings without a sensorKey will gently drift on mock data.
const BUILDINGS: {
  id: string;
  name: string;
  x: number;
  y: number;
  size?: number;
  // The node key in the backend payload (e.g. "node1"). The bloom level for
  // this building = light + sound from that node, clamped to 0..100.
  nodeKey?: string;
}[] = [
  { id: "ugrad", name: "Undergraduate Student Residence", x: 73, y: 32, nodeKey: "node4" },
  { id: "academic", name: "Academic Building", x: 46, y: 45, nodeKey: "node1" },
  { id: "library", name: "Library", x: 60, y: 52, nodeKey: "node3" },
  { id: "community", name: "Community Center", x: 70, y: 50, nodeKey: "node5" },
  { id: "innovation", name: "Innovation Building", x: 33, y: 56, nodeKey: "node2" },
];

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const Index = () => {
  // Each building has its own bloom level 0..100, drifting independently.
  const [bloomLevels, setBloomLevels] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    BUILDINGS.forEach((b) => {
      initial[b.id] = Math.random() * 100;
    });
    return initial;
  });

  const [selected, setSelected] = useState<string | null>(null);

  // 🔌 Live sensor feed
  const { data: sensorData, status: sensorStatus } = useSensorData(
    SENSOR_ENDPOINT,
    POLL_INTERVAL_MS,
  );

  // Mock drift targets (used for buildings without a sensorKey, or as a
  // fallback when the backend is unreachable).
  const targetsRef = useRef<Record<string, number>>({});
  if (Object.keys(targetsRef.current).length === 0) {
    BUILDINGS.forEach((b) => {
      targetsRef.current[b.id] = Math.random() * 100;
    });
  }

  // Smoothly ease every flower toward its target each tick.
  // Targets come from the live sensor when available, else from mock drift.
  useEffect(() => {
    const interval = setInterval(() => {
      // Occasionally pick new mock targets for unmapped buildings.
      BUILDINGS.forEach((b) => {
        if (!b.nodeKey && Math.random() < 0.15) {
          targetsRef.current[b.id] = Math.random() * 100;
        }
      });

      setBloomLevels((prev) => {
        const next: Record<string, number> = {};
        BUILDINGS.forEach((b) => {
          const cur = prev[b.id];

          // Prefer live sensor value when available: bloom = light + sound,
          // clamped to 0..100. Falls back to mock drift if the node is missing.
          let target = targetsRef.current[b.id];
          if (sensorData && b.nodeKey) {
            const node = sensorData[b.nodeKey];
            if (node) {
              const light = typeof node.light === "number" ? node.light : 0;
              const sound = typeof node.sound === "number" ? node.sound : 0;
              if (typeof node.light === "number" || typeof node.sound === "number") {
                target = clamp(light + sound);
              }
            }
          }

          next[b.id] = cur + (target - cur) * 0.18;
        });
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [sensorData]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="pointer-events-auto">
          <h1 className="text-lg font-light tracking-[0.3em] text-foreground/80 sm:text-xl">
            BLOOMING<span className="ml-2 font-medium text-foreground">DKU</span>
          </h1>
          <p className="mt-1 text-[11px] font-light tracking-wider text-foreground/50">
            a quiet aerial view · campus in bloom
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Live sensor status pill */}
          <div
            className="flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5 text-[10px] font-light tracking-[0.2em] text-foreground/60 backdrop-blur-md"
            title={SENSOR_ENDPOINT}
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (sensorStatus === "live"
                  ? "bg-emerald-500 animate-pulse"
                  : sensorStatus === "error"
                    ? "bg-rose-400"
                    : "bg-foreground/30")
              }
            />
            {sensorStatus === "live"
              ? "LIVE"
              : sensorStatus === "error"
                ? "OFFLINE · MOCK"
                : "CONNECTING"}
          </div>
          {selected && (
            <div className="rounded-full bg-foreground/85 px-4 py-2 text-xs font-medium text-background backdrop-blur-md">
              {BUILDINGS.find((b) => b.id === selected)?.name}
            </div>
          )}
        </div>
      </header>

      {/* Map stage */}
      <div className="relative mx-auto flex min-h-screen w-full items-center justify-center">
        <div className="relative w-full">
          <div className="relative aspect-[1920/1180] w-full scale-[1.35] origin-center">
            <img
              src={campusMap}
              alt="Duke Kunshan University hand-drawn campus map"
              className="absolute inset-0 h-full w-full select-none object-cover"
              draggable={false}
            />

            {/* Flowers overlay */}
            {BUILDINGS.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b.id === selected ? null : b.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 hover:scale-110 focus:outline-none"
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                aria-label={b.name}
              >
                <Flower
                  bloomLevel={bloomLevels[b.id] ?? 0}
                  size={b.size ?? 44}
                  label={b.name}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center px-6 pb-5">
        <p className="text-[10px] font-light tracking-[0.25em] text-foreground/40">
          BUD · SEMI-BLOOM · BLOOM
        </p>
      </footer>
    </main>
  );
};

export default Index;
