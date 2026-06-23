'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import type { ViolationWithDetails } from '@/types'

export default function HistoryPage() {
  const [violations, setViolations] = useState<ViolationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<ViolationWithDetails[]>('/api/violations')
      .then(setViolations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Transaction History</h1>
        <p className="text-sm text-zinc-500">Complete record of all violations, fines, and payments.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : violations.length === 0 ? (
          <p className="text-sm text-zinc-400">No transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Plate</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-zinc-500">Fine</th>
                  <th className="text-center py-3 px-4 font-medium text-zinc-500">Rule Version</th>
                  <th className="text-center py-3 px-4 font-medium text-zinc-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v) => (
                  <tr key={v.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 px-4 text-zinc-600">
                      {new Date(v.violation_timestamp).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-900">{v.plate}</td>
                    <td className="py-3 px-4 text-zinc-600 capitalize">{v.violation_type.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-right font-medium text-zinc-900">
                      {v.fine_calculation
                        ? `Rp ${v.fine_calculation.total_fine.toLocaleString('id-ID')}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center text-zinc-600">
                      {v.fine_calculation?.rule_version_id
                        ? `v${v.fine_calculation.rule_version_id.slice(0, 8)}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${v.invoice?.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {v.invoice?.status || v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                      {v.transaction_id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
