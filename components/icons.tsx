// Hand-drawn icon system in Kiva's illustrated style:
// wobbly ink outlines (currentColor) over offset flat-green fills,
// like slightly misregistered print. 24px grid, round caps.
// Usage: <Icon name="coins" className="w-5 h-5 text-[#223829]" />

const GREEN = "#2AA967";
const LIGHT = "#A5D8BC";

const PATHS: Record<string, React.ReactNode> = {
  coins: (
    <>
      <circle cx="13.7" cy="13.4" r="7.8" fill={LIGHT} stroke="none" />
      <path d="M11.9 3.6c4.5-.3 8.3 3.3 8.5 7.8.2 4.5-3.4 8.4-7.9 8.7-4.6.2-8.4-3.4-8.6-7.9-.2-4.5 3.4-8.4 8-8.6z" />
      <path d="M12.3 7.2c-.1 3.2-.2 6.4-.4 9.6" />
      <path d="M14.9 9.3c-.6-.9-1.7-1.4-2.8-1.3-1.3.1-2.4.9-2.3 2 .1 1.2 1.4 1.5 2.6 1.7 1.2.2 2.5.7 2.4 1.9 0 1.2-1.3 1.9-2.7 1.9-1.1 0-2.1-.5-2.7-1.4" />
    </>
  ),
  heart: (
    <>
      <path
        d="M12 20c-.5-.3-6.2-4.7-6.7-7.9-.3-2 .8-3.9 2.8-4.3 1.5-.3 2.9.4 3.8 1.7.8-1.4 2.3-2.1 3.8-1.8 2 .4 3.2 2.2 2.9 4.3-.5 3.2-6.1 7.7-6.6 8z"
        transform="translate(1.6 1.3) scale(0.94)" fill={GREEN} stroke="none"
      />
      <path d="M12 20c-.5-.3-6.2-4.7-6.7-7.9-.3-2 .8-3.9 2.8-4.3 1.5-.3 2.9.4 3.8 1.7.8-1.4 2.3-2.1 3.8-1.8 2 .4 3.2 2.2 2.9 4.3-.5 3.2-6.1 7.7-6.6 8z" />
      <path d="M12 1.6v1.8M5.9 3.2l1.1 1.5M18.1 3.2 17 4.7" />
    </>
  ),
  globe: (
    <>
      <circle cx="13.6" cy="13.5" r="7.7" fill={LIGHT} stroke="none" />
      <path d="M11.9 3.6c4.5-.3 8.3 3.3 8.5 7.8.2 4.5-3.4 8.4-7.9 8.7-4.6.2-8.4-3.4-8.6-7.9-.2-4.5 3.4-8.4 8-8.6z" />
      <path d="M12 3.8c-3 2.6-3.1 13.8.1 16.4 2.9-2.7 2.8-13.9-.1-16.4z" />
      <path d="M4.2 9.7c5.1-1 10.5-1 15.6-.2M4.4 14.8c5 .9 10.2.9 15.2 0" />
    </>
  ),
  check: (
    <>
      <circle cx="13.6" cy="13.4" r="7.7" fill={LIGHT} stroke="none" />
      <path d="M11.9 3.6c4.5-.3 8.3 3.3 8.5 7.8.2 4.5-3.4 8.4-7.9 8.7-4.6.2-8.4-3.4-8.6-7.9-.2-4.5 3.4-8.4 8-8.6z" />
      <path d="m7.9 12.3 2.7 2.8c1.7-2.1 3.5-4.1 5.5-5.8" />
    </>
  ),
  refresh: (
    <>
      <circle cx="13.4" cy="13.4" r="6.6" fill={LIGHT} stroke="none" />
      <path d="M19.8 12.2c-.1 4.3-3.6 7.8-7.9 7.7-4.3-.1-7.8-3.7-7.7-8 .1-4.3 3.7-7.7 8-7.6 2.3.1 4.3 1.1 5.7 2.7" />
      <path d="m20.2 3.5-.3 3.9-3.7-.4" />
    </>
  ),
  pin: (
    <>
      <path
        d="M12 20.8c-.2-.2-6.2-5.3-6.3-9.9-.1-3.7 2.7-6.6 6.3-6.7 3.6 0 6.5 2.9 6.4 6.6-.1 4.6-6.1 9.8-6.4 10z"
        transform="translate(1.6 1.2) scale(0.93)" fill={LIGHT} stroke="none"
      />
      <path d="M12 20.8c-.2-.2-6.2-5.3-6.3-9.9-.1-3.7 2.7-6.6 6.3-6.7 3.6 0 6.5 2.9 6.4 6.6-.1 4.6-6.1 9.8-6.4 10z" />
      <path d="M12 8.6c1.2 0 2.2.9 2.2 2.1 0 1.2-1 2.2-2.2 2.2s-2.2-1-2.2-2.2c0-1.2.9-2.1 2.2-2.1z" fill={GREEN} />
    </>
  ),
  pulse: (
    <>
      <rect x="5.5" y="8.8" width="13.5" height="7" rx="1.5" fill={LIGHT} stroke="none" transform="rotate(-2.5 12 12)" />
      <path d="M3.2 12.4h3.9l2.4-5.8 4.4 11.7 2.6-6h4.3" />
    </>
  ),
  ledger: (
    <>
      <rect x="6.8" y="5.4" width="13.4" height="16.2" rx="2" fill={LIGHT} stroke="none" />
      <path d="m7.2 3.6 9.7.1c1.1 0 2 .9 2 2l-.1 13c0 1.1-.9 2-2 2l-9.7-.1c-1.1 0-2-.9-2-2l.1-13c0-1.1.9-2 2-2z" />
      <path d="m9 8.6 6.1-.1M9 12.1l6.1-.1M9 15.5l3.7-.1" />
    </>
  ),
  vault: (
    <>
      <rect x="6.2" y="10.4" width="13.6" height="8.6" fill={LIGHT} stroke="none" />
      <path d="M12 3.2 3.8 8.7c5.5.3 10.9.3 16.4 0L12 3.2z" />
      <path d="M6.2 11.1v6.7M10.1 11.1v6.7M14 11.1v6.7M17.9 11.1v6.7" />
      <path d="M3.6 20.8c5.6-.3 11.2-.3 16.8 0" />
    </>
  ),
  chart: (
    <>
      <rect x="10.4" y="6.8" width="3.3" height="13" rx="0.6" fill={GREEN} stroke="none" />
      <path d="m5.2 13.9 3-.1.2 6.1-3 .1z" />
      <path d="m15.9 10.8 3-.1.2 9.1-3 .1z" />
      <path d="M3.4 20.3c5.8.3 11.6.3 17.4 0" />
    </>
  ),
  hourglass: (
    <>
      <path d="M9.3 17.7h5.4L12 14.7z" fill={GREEN} stroke="none" />
      <path d="M6.6 3.6c3.6-.2 7.2-.2 10.8 0M6.6 20.4c3.6.2 7.2.2 10.8 0" />
      <path d="M7.6 3.7v3c0 2.5 4.4 3.7 4.4 5.3s-4.4 2.9-4.4 5.4v3M16.4 3.7v3c0 2.5-4.4 3.7-4.4 5.3s4.4 2.9 4.4 5.4v3" />
    </>
  ),
  droplet: (
    <>
      <path
        d="M12 3.4s6.6 6.7 6.5 11.2c-.1 3.6-3 6.4-6.6 6.4-3.6-.1-6.5-3-6.4-6.6.1-4.5 6.5-11 6.5-11z"
        transform="translate(1.7 1.4) scale(0.92)" fill={LIGHT} stroke="none"
      />
      <path d="M12 3.4s6.6 6.7 6.5 11.2c-.1 3.6-3 6.4-6.6 6.4-3.6-.1-6.5-3-6.4-6.6.1-4.5 6.5-11 6.5-11z" />
    </>
  ),
  sliders: (
    <>
      <path d="M3.8 7.6c5.5-.2 10.9-.2 16.4 0M3.8 16.4c5.5.2 10.9.2 16.4 0" />
      <circle cx="9" cy="7.5" r="2.1" fill={GREEN} />
      <circle cx="15" cy="16.5" r="2.1" fill={GREEN} />
    </>
  ),
  leaf: (
    <>
      <path
        d="M5 19.2C5 10.6 10.7 5 19.7 4.4c.4 9.1-5.1 14.7-13.6 14.8"
        transform="translate(1.7 1.4) scale(0.92)" fill={LIGHT} stroke="none"
      />
      <path d="M5 19.2C5 10.6 10.7 5 19.7 4.4c.4 9.1-5.1 14.7-13.6 14.8" />
      <path d="M5.4 18.8c3.2-4.6 7.1-8.4 11.3-10.9" />
    </>
  ),
  arrow: (
    <>
      <path d="M4.2 12.1c5.2-.2 10.4-.2 15.6 0" />
      <path d="M14.3 6.3c2 1.9 3.9 3.8 5.5 5.8-1.9 1.9-3.8 3.8-5.5 5.6" />
    </>
  ),
  message: (
    <>
      <path
        d="M20.8 11.9c.1 4.7-3.7 8.6-8.4 8.6-1.5 0-3-.4-4.2-1.1l-4.6 1.1 1.2-4.4c-.8-1.3-1.2-2.8-1.2-4.4C3.5 7 7.3 3.3 12 3.4c4.7 0 8.7 3.8 8.8 8.5z"
        transform="translate(1.6 1.3) scale(0.93)" fill={LIGHT} stroke="none"
      />
      <path d="M20.8 11.9c.1 4.7-3.7 8.6-8.4 8.6-1.5 0-3-.4-4.2-1.1l-4.6 1.1 1.2-4.4c-.8-1.3-1.2-2.8-1.2-4.4C3.5 7 7.3 3.3 12 3.4c4.7 0 8.7 3.8 8.8 8.5z" />
      <path d="M8.5 12.1h.2M11.9 12.1h.2M15.3 12.1h.2" />
    </>
  ),
  sparkle: (
    <>
      <path
        d="M12 3.2c.9 4.5 3.3 6.9 7.8 7.6-4.5.9-6.9 3.3-7.6 7.8-.9-4.5-3.3-6.9-7.8-7.6 4.5-.9 6.9-3.3 7.6-7.8z"
        transform="translate(1.6 1.3) scale(0.92)" fill={GREEN} stroke="none"
      />
      <path d="M12 3.2c.9 4.5 3.3 6.9 7.8 7.6-4.5.9-6.9 3.3-7.6 7.8-.9-4.5-3.3-6.9-7.8-7.6 4.5-.9 6.9-3.3 7.6-7.8z" />
    </>
  ),
  send: (
    <>
      <path
        d="M20.7 3.4l-6.5 17c-1.4-2.2-2.7-4.4-4-6.6-2.3-1.2-4.6-2.3-6.9-3.5l17.4-6.9z"
        transform="translate(1.5 1.3) scale(0.92)" fill={LIGHT} stroke="none"
      />
      <path d="M20.7 3.4C17.2 7 13.7 10.5 10.2 14" />
      <path d="m20.7 3.4-6.5 17c-1.4-2.2-2.7-4.4-4-6.6-2.3-1.2-4.6-2.3-6.9-3.5l17.4-6.9z" />
    </>
  ),
  lock: (
    <>
      <rect x="6.4" y="11.9" width="14" height="9.2" rx="2" fill={LIGHT} stroke="none" />
      <path d="m6 10.7 12-.1c.7 0 1.4.6 1.4 1.4l.1 6.4c0 .8-.6 1.4-1.4 1.4l-12 .1c-.8 0-1.4-.6-1.4-1.4l-.1-6.4c0-.8.6-1.4 1.4-1.4z" />
      <path d="m8.4 10.6.1-2.6c0-2 1.5-3.6 3.5-3.6s3.6 1.5 3.6 3.5v2.6" />
      <circle cx="12" cy="15.3" r="1.4" fill={GREEN} stroke="none" />
    </>
  ),
};

export default function Icon({ name, className, accent }: { name: string; className?: string; accent?: boolean }) {
  const path = PATHS[name];
  if (!path) return null;
  void accent; // fills are baked into the artwork now
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
