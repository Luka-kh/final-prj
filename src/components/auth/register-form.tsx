"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { motion } from "motion/react"
import { z } from "zod"
import { signUp } from "@/lib/auth-client"

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must contain at least 2 characters"),
    username: z
      .string()
      .trim()
      .min(3, "Username must contain at least 3 characters")
      .max(30, "Username cannot exceed 30 characters")
      .regex(
        /^[a-zA-Z0-9_.]+$/,
        "Use only letters, numbers, underscores, and periods",
      ),
    email: z.string().trim().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[a-z]/, "Include at least one lowercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterValues = z.infer<typeof registerSchema>
type RegisterErrors = Partial<Record<keyof RegisterValues | "form", string>>

const initialValues: RegisterValues = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
}

export function RegisterForm() {
  const router = useRouter()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function updateValue(field: keyof RegisterValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = registerSchema.safeParse(values)

    if (!result.success) {
      const nextErrors: RegisterErrors = {}

      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof RegisterValues

        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message
        }
      }

      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    const response = await signUp.email({
      name: result.data.name,
      username: result.data.username,
      displayUsername: result.data.username,
      email: result.data.email,
      password: result.data.password,
    })

    if (response.error) {
      setErrors({
        form:
          response.error.message ??
          "We could not create your account. Please try again.",
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
            staggerChildren: 0.06,
          },
        },
      }}
    >
      <FormField
        label="Full name"
        value={values.name}
        onChange={(value) => updateValue("name", value)}
        error={errors.name}
        placeholder="Enter your full name"
        autoComplete="name"
      />

      <FormField
        label="Username"
        value={values.username}
        onChange={(value) => updateValue("username", value)}
        error={errors.username}
        placeholder="Choose a username"
        autoComplete="username"
      />

      <FormField
        label="Email"
        type="email"
        value={values.email}
        onChange={(value) => updateValue("email", value)}
        error={errors.email}
        placeholder="you@example.com"
        autoComplete="email"
      />

      <FormField
        label="Password"
        type={showPassword ? "text" : "password"}
        value={values.password}
        onChange={(value) => updateValue("password", value)}
        error={errors.password}
        placeholder="Create a password"
        autoComplete="new-password"
        trailingButton={
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="text-medium-grey transition hover:text-purple"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      <FormField
        label="Confirm password"
        type={showPassword ? "text" : "password"}
        value={values.confirmPassword}
        onChange={(value) => updateValue("confirmPassword", value)}
        error={errors.confirmPassword}
        placeholder="Repeat your password"
        autoComplete="new-password"
      />

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
            Creating account
          </>
        ) : (
          "Create account"
        )}
      </motion.button>
    </motion.form>
  )
}

type FormFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  placeholder: string
  autoComplete: string
  trailingButton?: React.ReactNode
}

function FormField({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
  trailingButton,
}: FormFieldProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      <label className="mb-2 block text-xs font-bold text-medium-grey">
        {label}
      </label>

      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={`h-12 w-full rounded-md border bg-transparent px-4 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey/60 ${
            error
              ? "border-red focus:border-red"
              : "border-(--border) hover:border-purple focus:border-purple"
          } ${trailingButton ? "pr-12" : ""}`}
        />

        {trailingButton && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {trailingButton}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red" role="alert">
          {error}
        </p>
      )}
    </motion.div>
  )
}