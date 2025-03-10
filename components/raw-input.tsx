"use client"

import { useRef, useEffect } from "react"

interface RawInputProps {
  initialValue?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RawInput({
  initialValue = "",
  onValueChange,
  placeholder = "0.0",
  disabled = false,
  className = "",
}: RawInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Set initial value
  useEffect(() => {
    if (inputRef.current && initialValue) {
      inputRef.current.value = initialValue
    }
  }, [initialValue])

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialValue}
      onChange={(e) => {
        console.log("Raw input changed:", e.target.value)
        onValueChange(e.target.value)
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  )
}

