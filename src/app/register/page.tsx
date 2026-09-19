import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start organizing projects and collaborating with your friends."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-purple transition hover:text-purple-hover"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}