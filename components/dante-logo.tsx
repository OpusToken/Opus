export function DanteLogo({ className = "", size = 120 }: { className?: string; size?: number }) {
  return (
    <div className={`relative rounded-full overflow-hidden ${className}`} style={{ width: size, height: size }}>
      {/* Background with celestial gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a237e] via-[#283593] to-[#3949ab]">
        {/* Stars */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-yellow-200 rounded-full animate-twinkle"
            style={{
              width: Math.random() * 2 + 1 + "px",
              height: Math.random() * 2 + 1 + "px",
              top: Math.random() * 40 + "%",
              left: Math.random() * 100 + "%",
              animationDelay: Math.random() * 2 + "s",
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Main circular frame */}
      <div className="absolute inset-[2px] rounded-full overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Hell (left side) */}
          <path d="M0 50 Q 20 50 25 70 L 0 70 Z" fill="#4a1c1c" className="opacity-90" />
          <path d="M5 55 Q 15 55 20 65" stroke="#ff6b6b" strokeWidth="0.5" fill="none" className="animate-flicker" />

          {/* Purgatory Mountain (center) */}
          <path d="M35 70 L 50 30 L 65 70 Z" fill="#a1887f" className="opacity-80" />
          {/* Purgatory terraces */}
          {[60, 50, 40].map((y, i) => (
            <path
              key={i}
              d="M40 Y L60 Y"
              stroke="#d7ccc8"
              strokeWidth="0.5"
              fill="none"
              transform={`translate(0,${y})`}
            />
          ))}

          {/* Florence (right side) */}
          <path d="M75 70 L 75 45 Q 80 44 85 45 L 85 70 Z" fill="#d4af37" className="opacity-90" />
          {/* Duomo dome suggestion */}
          <path d="M77 45 Q 80 35 83 45" stroke="#ffd700" strokeWidth="0.5" fill="none" />

          {/* Dante figure (center) */}
          <g transform="translate(50,55)">
            {/* Robe */}
            <path d="M-5 0 L5 0 L3 15 L-3 15 Z" fill="#ff7f7f" />
            {/* Head */}
            <circle cx="0" cy="-3" r="3" fill="#ffe0b2" />
            {/* Laurel crown */}
            <path d="M-3 -5 Q 0 -7 3 -5" stroke="#4caf50" strokeWidth="0.5" fill="none" />
            {/* Book */}
            <rect x="3" y="2" width="4" height="5" fill="#fff" className="opacity-80" />
          </g>
        </svg>
      </div>

      {/* Outer glow effect */}
      <div className="absolute inset-0 rounded-full border-2 border-[#ffd700] opacity-50"></div>

      {/* Text "OPUS" */}
      <div
        className="absolute bottom-[10%] left-0 right-0 text-center font-bold text-white"
        style={{ fontSize: size / 10 }}
      >
        OPUS
      </div>

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  )
}

