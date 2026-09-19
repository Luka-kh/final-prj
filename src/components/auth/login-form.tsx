"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { motion } from "motion/react"
import { z } from "zod"
import { signIn } from "@/lib/auth-client"

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
})

type LoginValues = z.infer<typeof loginSchema>
type LoginErrors = Partial<Record<keyof LoginValues | "form", string>>

export function LoginForm() {
  const router = useRouter()
  const [values, setValues] = useState<LoginValues>({
    identifier: "",
    password: "",
  })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function updateValue(field: keyof LoginValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = loginSchema.safeParse(values)

    if (!result.success) {
      const nextErrors: LoginErrors = {}

      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginValues

        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message
        }
      }

      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    const identifier = result.data.identifier
    const response = identifier.includes("@")
      ? await signIn.email({
          email: identifier,
          password: result.data.password,
        })
      : await signIn.username({
          username: identifier,
          password: result.data.password,
        })

    if (response.error) {
      setErrors({
        form: "The email, username, or password is incorrect.",
      })
      setIsSubmitting(false)
      return
    }

    router.push("/boards")
    router.refresh()
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        <label className="mb-2 block text-xs font-bold text-medium-grey">
          Email or username
        </label>
        <input
          type="text"
          value={values.identifier}
          onChange={(event) => updateValue("identifier", event.target.value)}
          placeholder="Enter your email or username"
          autoComplete="username"
          aria-invalid={Boolean(errors.identifier)}
          className={`h-12 w-full rounded-md border bg-transparent px-4 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey/60 ${
            errors.identifier
              ? "border-red focus:border-red"
              : "border-(--border) hover:border-purple focus:border-purple"
          }`}
        />
        {errors.identifier && (
          <p className="mt-1.5 text-xs font-medium text-red" role="alert">
            {errors.identifier}
          </p>
        )}
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        <label className="mb-2 block text-xs font-bold text-medium-grey">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={values.password}
            onChange={(event) => updateValue("password", event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            className={`h-12 w-full rounded-md border bg-transparent px-4 pr-12 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey/60 ${
              errors.password
                ? "border-red focus:border-red"
                : "border-(--border) hover:border-purple focus:border-purple"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-medium-grey transition hover:text-purple"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs font-medium text-red" role="alert">
            {errors.password}
          </p>
        )}
      </motion.div>

      {errors.form && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red/10 px-4 py-3 text-sm font-medium text-red"
          role="alert"
        >
          {errors.form}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={isSubmitting ? undefined : { scale: 1.01 }}
        whileTap={isSubmitting ? undefined : { scale: 0.98 }}
        className="flex h-12 w-full items-center justify-center rounded-full bg-purple px-5 text-sm font-bold text-white transition hover:bg-purple-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="mr-2 animate-spin" size={18} />
            Signing in
          </>
        ) : (
          "Sign in"
        )}
      </motion.button>
    </motion.form>
  )
}