'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiGet } from '@/lib/api'
import type { ViolationWithDetails } from '@/types'

export default function ViolationDetailPage() {
  const params = useParams()
  const [violation, setViolation] = useState<ViolationWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<ViolationWithDetails>(`/api/violations/${params.id}`)
      .then(setViolation)
      .catch(() => console.error('Failed to load violation'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <p className="text-sm text-zinc-400">Loading...</p>
  if (!violation) return <p className="text-sm text-red-600">Violation not found.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Violation Detail</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-zinc-500">Plate:</span>
          <span className="ml-2 font-medium text-zinc-900">{violation.plate}</span>
        </div>
        <div>
          <span className="text-zinc-500">Type:</span>
          <span className="ml-2 font-medium text-zinc-900 capitalize">{violation.violation_type.replace(/_/g, ' ')}</span>
        </div>
        <div>
          <span className="text-zinc-500">Location:</span>
          <span className="ml-2 font-medium text-zinc-900">{violation.location}</span>
        </div>
        <div>
          <span className="text-zinc-500">Timestamp:</span>
          <span className="ml-2 font-medium text-zinc-900">{new Date(violation.violation_timestamp).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-zinc-500">Status:</span>
          <span className="ml-2 font-medium text-zinc-900">{violation.status}</span>
        </div>
        {violation.fine_calculation && (
          <>
            <div>
              <span className="text-zinc-500">Fine:</span>
              <span className="ml-2 font-medium text-zinc-900">Rp {violation.fine_calculation.total_fine.toLocaleString('id-ID')}</span>
            </div>
            <div>
              <span className="text-zinc-500">Rule Version:</span>
              <span className="ml-2 font-medium text-zinc-900">v{violation.fine_calculation.rule_version_id}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
