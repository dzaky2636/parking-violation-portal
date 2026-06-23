import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-4">
      <Suspense fallback={<div className="text-sm text-zinc-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
