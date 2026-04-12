'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('user already registered'))
    return 'An account with this email already exists. Try signing in instead.'
  if (m.includes('email rate limit exceeded') || m.includes('rate limit'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (m.includes('password should be at least 6 characters'))
    return 'Password must be at least 6 characters.'
  if (m.includes('database error'))
    return `Sign-up failed due to a database error: ${message}`
  return `Something went wrong: ${message}`
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    // The public.users row is created automatically by the on_auth_user_created
    // database trigger (migration 008). Name is passed via user metadata so the
    // trigger can store it. Pre-registration role resolution also happens in the trigger.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(mapAuthError(signUpError.message))
      setLoading(false)
      return
    }

    // session is null when Supabase email confirmation is enabled.
    // The user must click the confirmation link before they can sign in.
    if (!data.session) {
      setConfirmationSent(true)
      setLoading(false)
      return
    }

    router.push('/')
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 p-8 border rounded-lg shadow-sm text-center">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <Link href="/login" className="text-sm font-medium underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border rounded-lg shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Get started with the API Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
