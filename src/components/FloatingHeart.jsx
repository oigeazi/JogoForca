import { useId } from "react";

function FloatingHeart({ className = "" }) {
  const id = useId().replace(/:/g, "");
  const gradientId = `heart-gradient-${id}`;
  const highlightId = `heart-highlight-${id}`;
  const shadowId = `heart-shadow-${id}`;
  const filterId = `heart-filter-${id}`;

  return (
    <svg
      className={className}
      viewBox="0 0 100 92"
      aria-hidden="true"
      focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="18%" y1="16%" x2="78%" y2="88%">
          <stop offset="0%" stopColor="#ff89d0" />
          <stop offset="24%" stopColor="#fb71d2" />
          <stop offset="58%" stopColor="#f43faf" />
          <stop offset="100%" stopColor="#be1884" />
        </linearGradient>
        <radialGradient id={highlightId} cx="32%" cy="26%" r="52%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.81)" />
          <stop offset="24%" stopColor="rgba(255,255,255,0.48)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={shadowId} cx="74%" cy="78%" r="58%">
          <stop offset="0%" stopColor="rgba(136,19,55,0.48)" />
          <stop offset="100%" stopColor="rgba(136,19,55,0)" />
        </radialGradient>
        <radialGradient id={`heart-rim-${id}`} cx="50%" cy="18%" r="82%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="5"
            floodColor="rgba(255, 83, 212, 0.21)"
          />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`}>
        <path
          d="M50 86C44 81 38 75 30 68C17 56 6 46 6 30C6 16 17 6 31 6C40 6 47 10 50 18C53 10 60 6 69 6C83 6 94 16 94 30C94 46 83 56 70 68C62 75 56 81 50 86Z"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M50 86C44 81 38 75 30 68C17 56 6 46 6 30C6 16 17 6 31 6C40 6 47 10 50 18C53 10 60 6 69 6C83 6 94 16 94 30C94 46 83 56 70 68C62 75 56 81 50 86Z"
          fill={`url(#${highlightId})`}
        />
        <path
          d="M50 86C44 81 38 75 30 68C17 56 6 46 6 30C6 16 17 6 31 6C40 6 47 10 50 18C53 10 60 6 69 6C83 6 94 16 94 30C94 46 83 56 70 68C62 75 56 81 50 86Z"
          fill={`url(#${shadowId})`}
        />
        <path
          d="M50 86C44 81 38 75 30 68C17 56 6 46 6 30C6 16 17 6 31 6C40 6 47 10 50 18C53 10 60 6 69 6C83 6 94 16 94 30C94 46 83 56 70 68C62 75 56 81 50 86Z"
          fill={`url(#heart-rim-${id})`}
        />
      </g>
    </svg>
  );
}

export default FloatingHeart;
