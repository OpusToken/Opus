export function OpusLogo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <div className={`relative rounded-full overflow-hidden p-0 ${className}`} style={{ width: size, height: size }}>
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/opuslogo-r4Yhc5UR1DgXnkLtpqO609Mgpup1GP.webp"
        alt="Opus Logo"
        className="w-[120%] h-[120%] object-cover absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          filter: "drop-shadow(0 0 10px rgba(57, 255, 20, 0.3))",
        }}
      />
    </div>
  )
}

