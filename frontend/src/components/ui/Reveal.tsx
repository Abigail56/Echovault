import { type ReactNode, useEffect, useRef, useState } from "react";

type Phase = "static" | "hidden" | "visible";

/**
 * Fades its content in when it scrolls into view.
 *
 * The server renders content fully visible (so it works without JavaScript).
 * After loading, anything still below the fold is hidden and then revealed
 * on scroll; anything already on screen is left alone, so nothing flickers.
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase((p) => (p === "hidden" ? "visible" : p));
          observer.disconnect();
        } else {
          setPhase((p) => (p === "static" ? "hidden" : p));
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const motion = phase === "static" ? "" : phase === "hidden" ? "reveal" : "reveal is-visible";
  return (
    <div ref={ref} className={`${motion} ${className}`}>
      {children}
    </div>
  );
}
