export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="logoRoyal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E3A8A" />
          <stop offset="1" stopColor="#1e2d6e" />
        </linearGradient>
      </defs>
      {/* shield */}
      <path
        d="M32 3 L57 13 V32 C57 49 45.5 57.5 32 61.5 C18.5 57.5 7 49 7 32 V13 Z"
        fill="url(#logoRoyal)"
      />
      {/* open book / pages */}
      <path
        d="M20 22 C24 19.5 28 19.5 32 21.5 C36 19.5 40 19.5 44 22 V40 C40 37.5 36 37.5 32 39.5 C28 37.5 24 37.5 20 40 Z"
        fill="#ffffff"
        fillOpacity="0.94"
      />
      <path d="M32 21.5 V39.5" stroke="#1E3A8A" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      {/* gold checkmark */}
      <path
        d="M25.5 49 l4.5 4.5 l8 -9"
        stroke="#D97706"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
