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

  const unpaidCount = violations.filter((v) => v.invoice?.status === 'unpaid').length
  const totalDue = violations
    .filter((v) => v.invoice?.status === 'unpaid')
    .reduce((sum, v) => sum + (v.fine_calculation?.total_fine || 0), 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Violations</h1>
          <p className="mt-1 text-sm text-slate-500">View and pay your parking violation fines.</p>
        </div>
        <div className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 sm:block">
          Member Workspace
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Violations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{violations.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Unpaid</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{unpaidCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Due</p>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalDue)}
          </p>
        </div>
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

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Violations</h2>
          <span className="text-sm text-slate-500">{violations.length} records</span>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-slate-500">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Loading violations...</span>
            </div>
          </div>
        ) : (
          <ViolationList violations={violations} showPayButton onPay={setPaying} />
        )}
      </div>
    </div>
  )
}
