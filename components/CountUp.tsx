"use client";
import { useEffect, useRef, useState } from "react";

// Animates "$25" / "1,000" style values from zero when scrolled into view.
// Non-numeric values (like the "-" placeholder) render unchanged.
export default function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const parsed = value.match(/^(\D*)([\d,]+)(\D*)$/);
  const [display, setDisplay] = useState(parsed ? `${parsed[1]}0${parsed[3]}` : value);

  useEffect(() => {
    if (!parsed || !ref.current) return;
    const prefix = parsed[1];
    const suffix = parsed[3];
    const target = parseInt(parsed[2].replace(/,/g, ""), 10);
    let raf = 0;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target === 0) {
          setDisplay(value);
          return;
        }
        const start = performance.now();
        const duration = 1100;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(prefix + Math.round(target * eased).toLocaleString() + suffix);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span ref={ref} className={className}>{display}</span>;
}
