"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: "class"
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme, enableSystem = true) {
  if (typeof document === "undefined") return "light"
  const resolvedTheme = theme === "system" && enableSystem ? getSystemTheme() : theme === "dark" ? "dark" : "light"

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  document.documentElement.style.colorScheme = resolvedTheme

  return resolvedTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    const storedTheme = window.localStorage.getItem("theme")
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : defaultTheme
  })
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">(() => getSystemTheme())
  const resolvedTheme = theme === "system" && enableSystem ? systemTheme : theme === "dark" ? "dark" : "light"

  React.useEffect(() => {
    applyTheme(theme, enableSystem)
  }, [theme, enableSystem, systemTheme])

  React.useEffect(() => {
    if (!enableSystem) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemTheme(getSystemTheme())
    mediaQuery.addEventListener("change", onChange)

    return () => mediaQuery.removeEventListener("change", onChange)
  }, [enableSystem])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    window.localStorage.setItem("theme", nextTheme)
    setThemeState(nextTheme)
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
