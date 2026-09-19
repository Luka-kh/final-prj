"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div className="flex h-12 items-center justify-center gap-6 rounded-md bg-(--page-background)">
      <Sun size={18} className="text-medium-grey" aria-hidden="true" />

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative h-5 w-10 rounded-full bg-purple transition hover:bg-purple-hover"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span
          className={`absolute top-0.75 h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
            isDark ? "translate-x-5.5" : "translate-x-1"
          }`}
        />
      </button>

      <Moon size={18} className="text-medium-grey" aria-hidden="true" />
    </div>
  )
}