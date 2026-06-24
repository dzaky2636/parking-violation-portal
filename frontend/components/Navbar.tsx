'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, LogOut } from 'lucide-react'

export default function Navbar() {
  const [role, setRole] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
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

  const isOfficer = role === 'officer'
  const accentColor = isOfficer ? 'indigo' : 'amber'
  const accentText = isOfficer ? 'text-indigo-700' : 'text-amber-700'
  const accentBg = isOfficer ? 'bg-indigo-50' : 'bg-amber-50'
  const accentBorder = isOfficer ? 'border-indigo-200' : 'border-amber-200'
  const navLinkActive = isOfficer ? 'text-indigo-600' : 'text-amber-600'

  const officerLinks = [
    { href: '/officer/violations', label: 'Violations' },
    { href: '/officer/rules', label: 'Fine Rules' },
  ]

  const memberLinks = [
    { href: '/member/violations', label: 'My Violations' },
    { href: '/member/history', label: 'History' },
  ]

  const links = isOfficer ? officerLinks : memberLinks

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <a
            href={isOfficer ? '/officer/violations' : '/member/violations'}
            className="flex items-center gap-2"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentBg} ${accentBorder} border`}>
              <ShieldCheck className={`h-4 w-4 ${accentText}`} />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900">PVP</span>
              <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">Portal</span>
            </div>
          </a>

          <div className="hidden items-center gap-1 sm:flex">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? `${navLinkActive} ${accentBg}`
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </a>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-sm font-medium text-slate-900">{email}</span>
            <span className="text-xs text-slate-500">{email}</span>
          </div>

          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${accentBg} ${accentText} ${accentBorder}`}>
            {role}
          </span>

            <button
              onClick={handleSignOut}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
        </div>
      </div>
    </nav>
  )
}
