'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import ViolationList from '@/components/ViolationList'
import PaymentButton from '@/components/PaymentButton'
import type { ViolationWithDetails } from '@/types'

export default function MemberViolationsPage() {
  const [violations, setViolations] = useState<ViolationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState<ViolationWithDetails | null>(null)

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
        <h1 className="text-xl font-bold text-zinc-900 mb-2">My Violations</h1>
        <p className="text-sm text-zinc-500">View and pay your parking violation fines.</p>
      </div>

      {paying && (
        <PaymentButton
          violation={paying}
          onPaid={() => {
            setPaying(null)
            fetchViolations()
          }}
        />
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Violations</h2>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : (
          <ViolationList violations={violations} showPayButton onPay={setPaying} />
        )}
      </div>
    </div>
  )
}
