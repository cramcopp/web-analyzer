"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className={`inline-flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 ${
        compact ? 'p-1.5' : 'p-2'
      }`}
      aria-label="Toggle theme"
    >
      <Sun className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0`} />
      <Moon className={`absolute ${compact ? 'h-4 w-4' : 'h-5 w-5'} rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100`} />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
