import type { ViolationWithDetails } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  invoiced: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-red-100 text-red-800',
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
    return <p className="text-zinc-500 text-sm">No violations found.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="text-left py-3 px-4 font-medium text-zinc-500">Plate</th>
            <th className="text-left py-3 px-4 font-medium text-zinc-500">Type</th>
            <th className="text-left py-3 px-4 font-medium text-zinc-500">Location</th>
            <th className="text-left py-3 px-4 font-medium text-zinc-500">Date</th>
            <th className="text-right py-3 px-4 font-medium text-zinc-500">Fine</th>
            <th className="text-center py-3 px-4 font-medium text-zinc-500">Status</th>
            {showPayButton && <th className="text-right py-3 px-4 font-medium text-zinc-500">Action</th>}
          </tr>
        </thead>
        <tbody>
          {violations.map((v) => (
            <tr key={v.id} className="border-b border-zinc-100 hover:bg-zinc-50">
              <td className="py-3 px-4 font-medium text-zinc-900">{v.plate}</td>
              <td className="py-3 px-4 text-zinc-600 capitalize">{v.violation_type.replace(/_/g, ' ')}</td>
              <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">{v.location}</td>
              <td className="py-3 px-4 text-zinc-600">
                {new Date(v.violation_timestamp).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right font-medium text-zinc-900">
                {v.fine_calculation
                  ? `Rp ${v.fine_calculation.total_fine.toLocaleString('id-ID')}`
                  : '—'}
              </td>
              <td className="py-3 px-4 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[v.status] || 'bg-zinc-100 text-zinc-700'}`}>
                  {v.status}
                </span>
              </td>
              {showPayButton && (
                <td className="py-3 px-4 text-right">
                  {v.invoice?.status === 'unpaid' && (
                    <button
                      onClick={() => onPay?.(v)}
                      className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Pay
                    </button>
                  )}
                  {v.invoice?.status === 'paid' && (
                    <span className="text-xs text-green-600 font-medium">Paid</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
