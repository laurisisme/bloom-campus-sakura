import { useEffect, useState } from "react";
import campusMap from "@/assets/campus-map.jpg";
import Flower from "@/components/Flower";

// Building positions as percentages of the map image (x, y).
// Tweak these to align flowers precisely over each building.
const BUILDINGS: { id: string; name: string; x: number; y: number; size?: number }[] = [
  { id: "faculty", name: "Faculty Residence", x: 22, y: 32 },
  { id: "residence", name: "Residence Hall", x: 33, y: 28 },
  { id: "service", name: "Service Building", x: 49, y: 30 },
  { id: "ugrad", name: "Undergraduate Student Residence", x: 73, y: 32 },
  { id: "water", name: "Water Pavilion", x: 34, y: 41 },
  { id: "conference", name: "Conference Center", x: 21, y: 47 },
  { id: "academic", name: "Academic Building", x: 46, y: 45 },
  { id: "grad", name: "Graduate Student Center", x: 60, y: 38 },
  { id: "soccer", name: "Soccer Field", x: 84, y: 41 },
  { id: "library", name: "Library", x: 60, y: 52 },
  { id: "community", name: "Community Center", x: 70, y: 50 },
  { id: "sports", name: "Sports Complex", x: 84, y: 53 },
  { id: "pickleball", name: "Pickleball Court", x: 14, y: 56 },
  { id: "observatory", name: "Observatory", x: 24, y: 60 },
  { id: "innovation", name: "Innovation Building", x: 33, y: 56 },
  { id: "whu", name: "WHU-Duke Research Institute", x: 48, y: 60 },
  { id: "landmark", name: "Landmark Tower", x: 67, y: 62 },
  { id: "admin", name: "Administration Building", x: 79, y: 60 },
  { id: "employee", name: "Employee Center", x: 89, y: 62 },
  { id: "visitor", name: "Visitor Center", x: 73, y: 70 },
];

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

  // Mock "sensor" updates: every few seconds, each flower drifts toward a new target.
  useEffect(() => {
    const targets: Record<string, number> = {};
    const velocities: Record<string, number> = {};
    BUILDINGS.forEach((b) => {
      targets[b.id] = Math.random() * 100;
      velocities[b.id] = 0;
    });

    const interval = setInterval(() => {
      // Occasionally pick new targets
      BUILDINGS.forEach((b) => {
        if (Math.random() < 0.15) {
          targets[b.id] = Math.random() * 100;
        }
      });

      setBloomLevels((prev) => {
        const next: Record<string, number> = {};
        BUILDINGS.forEach((b) => {
          const cur = prev[b.id];
          const target = targets[b.id];
          // Smooth easing toward target
          next[b.id] = cur + (target - cur) * 0.18;
        });
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

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
        {selected && (
          <div className="pointer-events-auto rounded-full bg-foreground/85 px-4 py-2 text-xs font-medium text-background backdrop-blur-md">
            {BUILDINGS.find((b) => b.id === selected)?.name}
          </div>
        )}
      </header>

      {/* Map stage */}
      <div className="relative mx-auto flex min-h-screen w-full items-center justify-center">
        <div className="relative w-full max-w-[1600px]">
          <div className="relative aspect-[1920/1180] w-full">
            <img
              src={campusMap}
              alt="Duke Kunshan University hand-drawn campus map"
              className="absolute inset-0 h-full w-full select-none object-contain"
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
