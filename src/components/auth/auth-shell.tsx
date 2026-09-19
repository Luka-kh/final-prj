"use client"

import type { ReactNode } from "react"
import { motion } from "motion/react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Logo } from "@/components/ui/logo"

type AuthShellProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-(--page-background) px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-purple/15 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-purple-hover/15 blur-3xl"
          animate={{
            x: [0, -25, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-medium-grey shadow-sm transition hover:text-purple"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      <motion.section
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-xl shadow-black/5 sm:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-(--text-primary)">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-medium-grey">
              {subtitle}
            </p>
          </div>

          {children}

          <div className="mt-7 border-t border-(--border) pt-6 text-center text-sm text-medium-grey">
            {footer}
          </div>
        </div>
      </motion.section>
    </main>
  )
}