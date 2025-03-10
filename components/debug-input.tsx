"use client"

import { useState } from "react"

export function DebugInput() {
  const [value, setValue] = useState("")

  return (
    <div className="p-4 bg-black/20 rounded-md mt-4">
      <h3 className="text-sm font-bold mb-2">Debug Input</h3>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Test input here"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="mt-2 text-xs">
        <p>Current value: "{value}"</p>
        <p>Value length: {value.length}</p>
        <p>Value type: {typeof value}</p>
      </div>
    </div>
  )
}

