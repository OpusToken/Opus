import { cn } from "@/lib/utils"
import type React from "react"
export function OpusLogo({ className = "", size = 120 }: { className?: string; size?: number }) {
  return (
    <div className={`relative rounded-full overflow-hidden ${className}`} style={{ width: size, height: size }}>
      {/* Outer glow effect */}
      <div className="absolute inset-0 bg-neon-green/20 blur-md"></div>

      {/* Border */}
      <div className="absolute inset-0 rounded-full border-2 border-neon-green/50"></div>

      {/* Inner content */}
      <div className="absolute inset-0 bg-deep-indigo/80 flex items-center justify-center overflow-hidden">
        {/* Dante silhouette */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[70%]">
          <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path
              d="M50 10C50 10 30 30 30 50C30 70 40 80 50 80C60 80 70 70 70 50C70 30 50 10 50 10Z"
              fill="rgba(255,255,255,0.15)"
            />
            <path d="M40 50C40 50 45 60 50 60C55 60 60 50 60 50" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <path d="M30 90C30 90 40 100 50 100C60 100 70 90 70 90" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          </svg>
        </div>

        {/* Concentric circles representing the realms of Divine Comedy */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Inferno (Hell) - innermost circle */}
          <div className="absolute w-[40%] h-[40%] rounded-full border border-red-500/50 animate-pulse"></div>

          {/* Purgatorio (Purgatory) - middle circle */}
          <div
            className="absolute w-[60%] h-[60%] rounded-full border border-amber-500/50 animate-pulse"
            style={{ animationDelay: "0.5s" }}
          ></div>

          {/* Paradiso (Heaven) - outer circle */}
          <div
            className="absolute w-[80%] h-[80%] rounded-full border border-neon-green/50 animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        {/* Stars in the background */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                width: Math.random() * 2 + 1 + "px",
                height: Math.random() * 2 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
                animationDelay: Math.random() * 2 + "s",
                opacity: Math.random() * 0.5 + 0.3,
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Text "OPUS" at the bottom */}
      <div
        className="absolute bottom-[10%] left-0 right-0 text-center text-white font-bold text-xs"
        style={{ fontSize: size / 10 }}
      >
        OPUS
      </div>
    </div>
  )
}

// If there's a Logo component that wraps the OpusLogo, adjust its container styling

// If the component has padding or margins like this:
export function Logo({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("p-1", className)} {...props}>
      <OpusLogo className="h-10 w-10" />
    </div>
  )
}

