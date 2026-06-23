'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import ViolationForm from '@/components/ViolationForm'
import ViolationList from '@/components/ViolationList'
import type { ViolationWithDetails } from '@/types'

export default function OfficerViolationsPage() {
  const [violations, setViolations] = useState<ViolationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchViolations = useCallback(async () => {
    try {
      const data = await apiGet<ViolationWithDetails[]>('/api/violations')
      setViolations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load violations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchViolations()
  }, [fetchViolations])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Violations</h1>
        <p className="text-sm text-zinc-500">Submit new violations and view all records.</p>
      </div>

      <ViolationForm onSuccess={(v) => setViolations((prev) => [{ ...v, status: 'pending' }, ...prev])} />

      <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">All Violations</h2>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : (
          <ViolationList violations={violations} />
        )}
      </div>
    </div>
  )
}
