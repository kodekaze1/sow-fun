// Line-icon system, Kiva-style: 24px grid, 1.75 stroke, round caps, currentColor.
// Usage: <Icon name="coins" className="w-5 h-5 text-[#276A43]" />

const PATHS: Record<string, React.ReactNode> = {
  coins: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9" />
      <path d="M14.6 9.6c-.5-.9-1.5-1.4-2.6-1.4-1.4 0-2.6.7-2.6 1.9 0 1.3 1.3 1.7 2.6 1.9 1.3.2 2.6.6 2.6 1.9 0 1.2-1.2 1.9-2.6 1.9-1.1 0-2.1-.5-2.6-1.4" />
    </>
  ),
  heart: (
    <path d="M12 20.3 5.2 13.6a4.6 4.6 0 0 1 0-6.5 4.5 4.5 0 0 1 6.4 0l.4.4.4-.4a4.5 4.5 0 0 1 6.4 0 4.6 4.6 0 0 1 0 6.5L12 20.3z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="3.6" ry="8.5" />
      <path d="M4 9.5h16M4 14.5h16" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.3 2.4 2.4 5-5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 3.5V7h-3.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.4-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.8" r="2.3" />
    </>
  ),
  pulse: <path d="M3 12h4l2.5-6 4.5 12 2.5-6H21" />,
  ledger: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
    </>
  ),
  vault: (
    <>
      <path d="M3.5 21h17" />
      <path d="M12 3 3.5 8.5h17L12 3z" />
      <path d="M6 11v7M10 11v7M14 11v7M18 11v7" />
    </>
  ),
  chart: <path d="M5 20v-6M10.5 20V7M16 20v-9M21 20H3" />,
  droplet: <path d="M12 21a6.5 6.5 0 0 1-6.5-6.5C5.5 10 12 3.5 12 3.5s6.5 6.5 6.5 11A6.5 6.5 0 0 1 12 21z" />,
  sliders: (
    <>
      <path d="M4 7.5h16M4 16.5h16" />
      <circle cx="9" cy="7.5" r="2" fill="white" />
      <circle cx="15" cy="16.5" r="2" fill="white" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19C5 10.5 10.5 5 19.5 4.5 20 13.5 14.5 19 6 19" />
      <path d="M5 19c3-4.5 7-8.5 11.5-11" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  hourglass: (
    <>
      <path d="M6.5 3.5h11M6.5 20.5h11" />
      <path d="M7.5 3.5v3.2c0 2.5 4.5 3.8 4.5 5.3s-4.5 2.8-4.5 5.3v3.2M16.5 3.5v3.2c0 2.5-4.5 3.8-4.5 5.3s4.5 2.8 4.5 5.3v3.2" />
    </>
  ),
  message: (
    <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3.5 20.5l1.2-4.4A8.5 8.5 0 1 1 21 12z" />
  ),
  sparkle: (
    <path d="M12 3.5c.7 4.4 3.1 6.8 7.5 7.5-4.4.7-6.8 3.1-7.5 7.5-.7-4.4-3.1-6.8-7.5-7.5 4.4-.7 6.8-3.1 7.5-7.5z" />
  ),
  send: <path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-7-3.5 17.5-7z" />,
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
};

export default function Icon({ name, className }: { name: string; className?: string }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
