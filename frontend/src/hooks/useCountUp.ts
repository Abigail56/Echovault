import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Animates a number from its previous value to `target` (ease-out). */
export function useCountUp(target: number | undefined, durationMs = 700): number | undefined {
  const [value, setValue] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (target === undefined) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = prefersReducedMotion() ? 1 : Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return target === undefined ? undefined : (value ?? 0);
}
