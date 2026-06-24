'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.app_metadata?.role

    const redirect = searchParams.get('redirect')
    if (redirect) {
      router.push(redirect)
    } else if (role === 'officer') {
      router.push('/officer')
    } else {
      router.push('/member')
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parking Violation Portal</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to access your dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Authentication</p>
        </div>

        <div className="space-y-5 p-8">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="officer@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign in to dashboard'
            )}
          </button>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-8 py-4">
          <p className="text-center text-xs text-slate-500">
            Secured by Supabase Auth
          </p>
        </div>
      </form>
    </div>
  )
}
