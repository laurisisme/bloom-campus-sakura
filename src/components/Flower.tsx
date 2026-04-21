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
const Flower = ({ bloomLevel, size = 56, label }: FlowerProps) => {
  const clamped = Math.max(0, Math.min(100, bloomLevel));
  const t = clamped / 100; // 0..1

  // Continuous interpolation across the 3 phases.
  // Bud: very tight, small. Semi: petals separate. Bloom: full radial spread.
  const overallScale = 0.32 + t * 0.78; // 0.32 → 1.10 (with breathing on top)
  const petalSeparation = t * (size * 0.18); // outward translate per petal
  const petalScale = 0.45 + t * 0.75; // each petal grows
  const petalRotate = -10 + t * 18; // gentle rotation as it opens
  const centerScale = 0.55 + t * 0.55;
  const glow = Math.max(0, t - 0.55) * 2.2; // glow only near full bloom
  const petalOpacity = 0.55 + t * 0.45;

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
