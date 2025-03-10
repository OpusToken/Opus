export function PulsechainLogo({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Hexagon with gradient */}
        <defs>
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF3366" />
            <stop offset="50%" stopColor="#9B51E0" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* Hexagon shape */}
        <path d="M12 2L21.6 7.5V16.5L12 22L2.4 16.5V7.5L12 2Z" fill="url(#pulseGradient)" />

        {/* Pulse line */}
        <path
          d="M4 12H7L9 8L12 16L15 10L17 14L20 12"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

