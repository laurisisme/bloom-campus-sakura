import { useEffect, useState, useMemo } from "react";

interface FlowerProps {
  bloomLevel: number; // 0-100
  size?: number; // base diameter in px at full bloom
  label?: string;
}

/**
 * Top-down (orthographic) cherry blossom.
 * - 5 petals arranged radially around the center.
 * - bloomLevel 0-100 drives:
 *    - overall scale (bud → bloom)
 *    - petal separation (translation outward from center)
 *    - petal individual scale & opening
 *    - subtle rotation
 *    - glow intensity at full bloom
 *    - "breathing" pulse near full bloom
 */
// ── Phase bands ──────────────────────────────────────────────────────────
// Bud:        0 – 33   (tight, holds shape, slow to give)
// Semi-bloom: 34 – 66  (petals separate & rotate outward — most "alive" phase)
// Bloom:      67 – 100 (settles into full radial spread, soft glow + breathing)
type Phase = "bud" | "semi" | "bloom";
const phaseOf = (v: number): Phase =>
  v < 34 ? "bud" : v < 67 ? "semi" : "bloom";

// Easing curves — one per transition, each shaped to match the *feeling*
// of that part of the opening:
//   • bud → semi:  easeOutCubic — releases slowly, then yields outward
//   • semi → bloom: easeInOutQuint with a gentle overshoot so the final
//                   petals feel like they "settle" into place
//   • inside bud:  easeInQuad — almost no movement, just a quiet swell
const easeInQuad   = (x: number) => x * x;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOutQuint = (x: number) =>
  x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
const softOvershoot = (x: number) => {
  // gentle settle: peak ~1.04 then relax to 1
  const e = easeInOutQuint(x);
  return e + Math.sin(x * Math.PI) * 0.04 * (1 - x);
};

const Flower = ({ bloomLevel, size = 56, label }: FlowerProps) => {
  const clamped = Math.max(0, Math.min(100, bloomLevel));
  const phase = phaseOf(clamped);

  // Local progress within the current phase (0..1), then per-phase easing.
  // This is what gives each transition its own organic character while
  // bloomLevel itself stays a single continuous value.
  let budP = 0, semiP = 0, bloomP = 0;
  if (phase === "bud") {
    budP = easeInQuad(clamped / 34);             // 0..1 across 0–33
  } else if (phase === "semi") {
    budP = 1;
    semiP = easeOutCubic((clamped - 34) / 33);   // 0..1 across 34–66
  } else {
    budP = 1;
    semiP = 1;
    bloomP = softOvershoot((clamped - 67) / 33); // 0..1 across 67–100
  }

  // Compose per-phase contributions. Each phase pushes specific properties,
  // so the flower visibly *does something different* in each band:
  //   bud    → small swell + faint center reveal
  //   semi   → petals translate outward + rotate (the "opening")
  //   bloom  → final scale settle + glow + breathing
  const overallScale =
    0.30 +              // baseline bud size
    budP   * 0.18 +     // bud → ~0.48
    semiP  * 0.32 +     // semi → ~0.80
    bloomP * 0.30;      // bloom → ~1.10

  const petalSeparation =
    semiP  * (size * 0.13) +  // most of the outward push happens here
    bloomP * (size * 0.05);   // tiny extra in full bloom

  const petalScale =
    0.40 +
    budP   * 0.12 +
    semiP  * 0.45 +
    bloomP * 0.23;

  // Rotation belongs almost entirely to the semi phase — that's where
  // the petals visually "twist open".
  const petalRotate = -10 + semiP * 22 + bloomP * 6;

  const centerScale = 0.50 + budP * 0.20 + semiP * 0.25 + bloomP * 0.15;

  // Glow only emerges in the bloom band.
  const glow = bloomP * 1.0;

  const petalOpacity = 0.55 + budP * 0.15 + semiP * 0.20 + bloomP * 0.10;

  // Drive transition durations off the active phase too — bud is patient,
  // semi opens briskly, bloom settles slowly.
  const transitionMs =
    phase === "bud" ? 1600 : phase === "semi" ? 900 : 1400;

  // t kept around for the breathing amplitude calc below.
  const t = clamped / 100;

  // Breathing pulse: subtle scale oscillation, only meaningful near full bloom.
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      // small sinusoidal breathing, amplitude scales with bloom
      setPulse(Math.sin(elapsed * 1.4) * 0.025 * Math.max(0, t - 0.4));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t]);

  const petals = useMemo(() => [0, 1, 2, 3, 4], []);

  return (
    <div
      className="group relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={label}
    >
      {/* Outer glow at full bloom */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-1000"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--sakura-glow) / 0.7) 0%, hsl(var(--sakura-glow) / 0) 65%)",
          opacity: glow,
          filter: "blur(6px)",
        }}
      />

      {/* Flower wrapper – overall scale + breathing */}
      <div
        className="relative will-change-transform"
        style={{
          width: size,
          height: size,
          transform: `scale(${overallScale + pulse})`,
          transition:
            "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Petals */}
        {petals.map((i) => {
          const angle = (360 / petals.length) * i;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 0,
                height: 0,
                transform: `translate(-50%, -50%) rotate(${angle + petalRotate}deg)`,
                transition: "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <div
                style={{
                  width: size * 0.55,
                  height: size * 0.7,
                  transform: `translate(-50%, -100%) translateY(${petalSeparation}px) scale(${petalScale})`,
                  transformOrigin: "50% 100%",
                  background:
                    "radial-gradient(ellipse at 50% 80%, hsl(var(--sakura-petal-deep)) 0%, hsl(var(--sakura-petal)) 45%, hsl(var(--sakura-petal-light)) 100%)",
                  borderRadius: "50% 50% 45% 45% / 70% 70% 30% 30%",
                  // notch at the tip (cherry blossom signature)
                  clipPath:
                    "polygon(0% 0%, 50% 8%, 100% 0%, 100% 100%, 0% 100%)",
                  opacity: petalOpacity,
                  boxShadow:
                    "inset 0 -2px 4px hsl(var(--sakura-petal-deep) / 0.4)",
                  transition:
                    "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 1200ms ease",
                }}
              />
            </div>
          );
        })}

        {/* Center (stamen) */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: size * 0.32,
            height: size * 0.32,
            transform: `translate(-50%, -50%) scale(${centerScale})`,
            background:
              "radial-gradient(circle, hsl(var(--sakura-center)) 0%, hsl(var(--sakura-center-deep)) 70%, hsl(var(--sakura-petal-deep)) 100%)",
            boxShadow:
              "0 0 6px hsl(var(--sakura-center) / 0.6), inset 0 0 4px hsl(var(--sakura-center-deep) / 0.6)",
            transition: "transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Hover label */}
      {label && (
        <div className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-medium text-background opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          {label}
        </div>
      )}
    </div>
  );
};

export default Flower;
