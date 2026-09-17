"use client";
import { useEffect } from "react";

// Fades [data-reveal] elements up as they enter the viewport.
// The hidden state only applies after `reveal-ready` lands on <html>,
// so content stays visible if JS never runs.
export default function ScrollReveal() {
  useEffect(() => {
    document.documentElement.classList.add("reveal-ready");
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
