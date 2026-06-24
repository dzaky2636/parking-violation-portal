'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import type { ViolationWithDetails } from '@/types'
import { AlertTriangle, Loader2, Clock } from 'lucide-react'

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  unpaid: { label: 'Unpaid', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transaction History</h1>
          <p className="mt-1 text-sm text-slate-500">Complete record of all violations, fines, and payments.</p>
        </div>
        <div className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 sm:block">
          Member Workspace
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error && (
            <div className="m-6 mb-0 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading history...</span>
            </div>
          </div>
        ) : violations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Clock className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No transactions found</h3>
            <p className="mt-1 text-sm text-slate-500">Your transaction history will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Plate</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 text-right font-semibold">Fine</th>
                  <th className="px-6 py-4 text-center font-semibold">Rule Version</th>
                  <th className="px-6 py-4 text-center font-semibold">Payment</th>
                  <th className="px-6 py-4 font-semibold">Transaction ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {violations.map((v) => {
                  const status = STATUS_CONFIG[v.invoice?.status || 'unpaid'] || STATUS_CONFIG.unpaid
                  return (
                    <tr key={v.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(v.violation_timestamp).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold uppercase tracking-wide text-slate-900">{v.plate}</td>
                      <td className="px-6 py-4 capitalize text-slate-700">{v.violation_type.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">
                        {v.fine_calculation ? formatIDR(v.fine_calculation.total_fine) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                          {v.fine_calculation?.rule_version_id ? v.fine_calculation.rule_version_id.slice(0, 8) : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text} ${status.border}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {v.transaction_id || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
