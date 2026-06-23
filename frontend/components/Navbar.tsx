'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [role, setRole] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setRole((user?.app_metadata?.role as string) || null)
      setEmail(user?.email || null)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!role) return null

  return (
    <nav className="bg-zinc-900 text-white px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-sm">PVP</span>
          <div className="flex gap-4 text-sm">
            {role === 'officer' && (
              <>
                <a href="/officer/violations" className="hover:text-zinc-300 transition-colors">Violations</a>
                <a href="/officer/rules" className="hover:text-zinc-300 transition-colors">Rules</a>
              </>
            )}
            {role === 'member' && (
              <>
                <a href="/member/violations" className="hover:text-zinc-300 transition-colors">My Violations</a>
                <a href="/member/history" className="hover:text-zinc-300 transition-colors">History</a>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">{email}</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-700 text-xs font-medium uppercase">{role}</span>
          <button
            onClick={handleSignOut}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
