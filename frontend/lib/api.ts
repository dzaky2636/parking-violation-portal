import { createClient } from '@/lib/supabase/client'

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080'

async function getHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getHeaders()
  const res = await fetch(`${API_GATEWAY}${path}`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed with status ${res.status}`)
  }
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getHeaders()
  const res = await fetch(`${API_GATEWAY}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed with status ${res.status}`)
  }
  return res.json()
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(`${API_GATEWAY}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed with status ${res.status}`)
  }
  return res.json()
}
