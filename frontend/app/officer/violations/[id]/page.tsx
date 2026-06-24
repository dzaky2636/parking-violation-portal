'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { apiGet } from '@/lib/api'
import type { ViolationWithDetails } from '@/types'
import { Clock, FileText, CircleCheck, Loader2 } from 'lucide-react'
import { type ComponentType } from 'react'

interface StatusConfig {
  label: string
  bg: string
  text: string
  border: string
  Icon: ComponentType<{ className?: string }>
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    Icon: Clock,
  },
  invoiced: {
    label: 'Invoiced',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    Icon: FileText,
  },
  paid: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    Icon: CircleCheck,
  },
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading violation details...</span>
        </div>
      </div>
    )
  }

  if (!violation) return <p className="text-sm text-red-600">Violation not found.</p>

  const status = STATUS_CONFIG[violation.status] || STATUS_CONFIG.pending
  const StatusIcon = status.Icon

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Violation Detail</h1>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${status.bg} ${status.text} ${status.border}`}>
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Violation Information</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">License Plate</p>
              <p className="mt-1 font-mono text-lg font-semibold uppercase tracking-wide text-slate-900">{violation.plate}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Violation Type</p>
              <p className="mt-1 text-lg font-medium capitalize text-slate-900">{violation.violation_type.replace(/_/g, ' ')}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Location</p>
              <p className="mt-1 text-base text-slate-700">{violation.location}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Timestamp</p>
              <p className="mt-1 text-base text-slate-700">{new Date(violation.violation_timestamp).toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Submitted</p>
              <p className="mt-1 text-base text-slate-700">{new Date(violation.created_at).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {violation.fine_calculation && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Fine Calculation</h2>
              </div>
              <div className="p-6">
                <div className="mb-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Fine</p>
                  <p className="mt-1 font-mono text-3xl font-bold text-slate-900">{formatIDR(violation.fine_calculation.total_fine)}</p>
                </div>
                <div className="space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base amount</span>
                    <span className="font-medium text-slate-900">{formatIDR(violation.fine_calculation.base_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time multiplier</span>
                    <span className="font-medium text-slate-900">{violation.fine_calculation.time_multiplier}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Repeat multiplier</span>
                    <span className="font-medium text-slate-900">{violation.fine_calculation.repeat_multiplier}x</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <span className="text-slate-500">Rule version</span>
                    <span className="font-mono font-medium text-slate-900">{violation.fine_calculation.rule_version_id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {violation.photo_url && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Evidence Photo</h2>
              </div>
              <div className="p-2">
                <img src={violation.photo_url} alt="Violation evidence" className="rounded-xl bg-slate-100 object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
