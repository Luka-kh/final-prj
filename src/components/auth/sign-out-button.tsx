"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, LoaderCircle } from "lucide-react"
import { motion } from "motion/react"
import { signOut } from "@/lib/auth-client"

export function SignOutButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleSignOut() {
    setIsPending(true)
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <motion.button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      whileTap={{ scale: 0.97 }}
      className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-purple px-5 text-sm font-bold text-white transition hover:bg-purple-hover disabled:opacity-60"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={18} />
      ) : (
        <>
          <LogOut className="mr-2" size={17} />
          Sign out
        </>
      )}
    </motion.button>
  )
}