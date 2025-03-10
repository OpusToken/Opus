"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import { Input } from "@/components/ui/input"

interface FormattedNumberInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function FormattedNumberInput({
  value,
  onChange,
  placeholder = "0.0",
  disabled = false,
  className = "",
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState("")

  // Format the value with commas when the component mounts or value changes
  useEffect(() => {
    if (value && !document.activeElement?.contains(document.querySelector(`input[value="${displayValue}"]`))) {
      // Only format if the input is not currently focused
      const numValue = Number.parseFloat(value)
      if (!isNaN(numValue)) {
        // Format with thousand separators
        setDisplayValue(numValue.toLocaleString("en-US"))
      } else {
        setDisplayValue(value)
      }
    }
  }, [value])

  // Update the handleChange function to better handle formatting
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Get the raw input value
    const inputValue = e.target.value

    // Remove all non-numeric characters except decimal point
    const numericValue = inputValue.replace(/[^0-9.]/g, "")

    // Ensure only one decimal point
    const parts = numericValue.split(".")
    const formattedValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : numericValue

    // Update the actual numeric value (without commas)
    onChange(formattedValue)

    // Update display value directly with the user's input
    // This allows typing without automatic formatting interfering
    setDisplayValue(inputValue)
  }

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}

