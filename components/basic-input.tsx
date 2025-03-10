"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"

interface BasicInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BasicInput({
  value,
  onChange,
  placeholder = "0.0",
  disabled = false,
  className = "",
}: BasicInputProps) {
  // Use a ref to track the input element
  const inputRef = useRef<HTMLInputElement>(null)

  // Use internal state to track input value
  const [inputValue, setInputValue] = useState(value)

  // Update internal state when external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log("Input changed:", newValue)
    setInputValue(newValue)
    onChange(newValue)
  }

  // Handle direct value updates via a button click (like MAX)
  useEffect(() => {
    if (inputRef.current && inputValue !== inputRef.current.value) {
      inputRef.current.value = inputValue
    }
  }, [inputValue])

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        defaultValue={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
      {/* Debug info - remove in production */}
      <div className="absolute right-2 top-2 text-xs text-gray-400 pointer-events-none">
        {inputValue.length > 0 ? inputValue.length : ""}
      </div>
    </div>
  )
}

