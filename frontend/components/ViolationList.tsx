import type { ViolationWithDetails } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  invoiced: {
    label: 'Invoiced',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75h4.5v4.5h-4.5v-4.5Z',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  unpaid: {
    label: 'Unpaid',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: 'M12 9v3.75m9.293-5.879-4.293 4.293M3.707 6.121l4.293 4.293M12 15.75h.007v.008H12v-.008Z',
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
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
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
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={status.icon} />
                      </svg>
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
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                          </svg>
                          Pay
                        </button>
                      ) : v.invoice?.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
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
