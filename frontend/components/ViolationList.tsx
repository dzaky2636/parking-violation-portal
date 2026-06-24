import type { ViolationWithDetails } from '@/types'
import { Clock, FileText, CircleCheck, AlertTriangle, CreditCard } from 'lucide-react'
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
  unpaid: {
    label: 'Unpaid',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    Icon: AlertTriangle,
  },
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function ViolationList({
  violations,
  showPayButton = false,
  onPay,
}: {
  violations: ViolationWithDetails[]
  showPayButton?: boolean
  onPay?: (violation: ViolationWithDetails) => void
}) {
  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <CircleCheck className="h-8 w-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">No violations found</h3>
        <p className="mt-1 text-sm text-slate-500">
          {showPayButton ? 'You have no outstanding violations.' : 'No violations have been submitted yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-6 py-4 font-semibold">Plate</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Location</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 text-right font-semibold">Fine</th>
              <th className="px-6 py-4 text-center font-semibold">Status</th>
              {showPayButton && <th className="px-6 py-4 text-right font-semibold">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {violations.map((v) => {
              const status = STATUS_CONFIG[v.status] || STATUS_CONFIG.pending
              const StatusIcon = status.Icon
              return (
                <tr key={v.id} className="group transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <a
                      href={showPayButton ? `/member/violations` : `/officer/violations/${v.id}`}
                      className="font-mono font-semibold uppercase tracking-wide text-slate-900 hover:text-indigo-600"
                    >
                      {v.plate}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="capitalize text-slate-700">{v.violation_type.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="max-w-xs truncate text-slate-600" title={v.location}>
                      {v.location}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(v.violation_timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {v.fine_calculation ? (
                      <span className="font-mono font-semibold text-slate-900">
                        {formatIDR(v.fine_calculation.total_fine)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text} ${status.border}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </td>
                  {showPayButton && (
                    <td className="px-6 py-4 text-right">
                      {v.invoice?.status === 'unpaid' ? (
                        <button
                          onClick={() => onPay?.(v)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-amber-200 hover:bg-amber-700"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay
                        </button>
                      ) : v.invoice?.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CircleCheck className="h-3.5 w-3.5" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
