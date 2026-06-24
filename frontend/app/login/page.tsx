import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-100 px-4 py-16">
      <Suspense fallback={<div className="text-sm text-slate-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
