"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { setTheme, theme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={`inline-flex items-center justify-center rounded-md transition-colors hover:bg-gray-100 ${
        compact ? 'h-11 w-11 rounded-full border border-[#d9e1ec] bg-white p-0 text-[#0f172a] shadow-sm' : 'p-2 dark:hover:bg-zinc-800'
      }`}
      aria-label="Toggle theme"
    >
      <Sun className={`${compact ? 'h-5 w-5' : 'h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0'}`} />
      {!compact && <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
