'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api'
import type { ViolationWithDetails, PaymentResponse } from '@/types'
import { CreditCard, AlertTriangle, CircleCheck, Loader2 } from 'lucide-react'

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function PaymentButton({
  violation,
  onPaid,
}: {
  violation: ViolationWithDetails
  onPaid?: (result: PaymentResponse) => void
}) {
  const [scenario, setScenario] = useState<'success' | 'failed'>('success')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PaymentResponse | null>(null)

  const handlePay = async () => {
    if (!violation.invoice?.id) return
    setError('')
    setLoading(true)

    try {
      const res = await apiPost<PaymentResponse>('/api/payments', {
        invoice_id: violation.invoice.id,
        scenario,
      })
      setResult(res)
      if (res.status === 'paid') {
        onPaid?.(res)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError('')
  }

  if (result) {
    const isPaid = result.status === 'paid'
    return (
      <div className={`overflow-hidden rounded-2xl border ${isPaid ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {isPaid ? <CircleCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
            <div>
              <h3 className={`text-lg font-semibold ${isPaid ? 'text-emerald-900' : 'text-rose-900'}`}>
                {isPaid ? 'Payment Successful' : 'Payment Failed'}
              </h3>
              <p className={`mt-1 text-sm ${isPaid ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isPaid
                  ? 'Your fine has been paid successfully.'
                  : 'The payment could not be processed. No charge was made.'}
              </p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Transaction ID</p>
                <p className="font-mono text-sm font-medium text-slate-900">{result.transaction_id}</p>
              </div>
              {!isPaid && (
                <button
                  onClick={reset}
                  className="mt-4 w-full rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Try Again
                </button>
              )}
              {isPaid && (
                <button
                  onClick={reset}
                  className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Pay Fine</h3>
              <p className="text-sm text-slate-500">Violation on {violation.plate}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Amount due</p>
            <p className="font-mono text-xl font-bold text-slate-900">
              {formatIDR(violation.fine_calculation?.total_fine || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="mb-2.5 block text-sm font-medium text-slate-700">Test Scenario</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScenario('success')}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                scenario === 'success'
                  ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${scenario === 'success' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                {scenario === 'success' && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-900">Success</span>
                <span className="block text-xs text-slate-500">Simulates a successful charge</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScenario('failed')}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                scenario === 'failed'
                  ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${scenario === 'failed' ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`}>
                {scenario === 'failed' && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-900">Failed</span>
                <span className="block text-xs text-slate-500">Simulates a declined charge</span>
              </div>
            </button>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-200 hover:from-amber-600 hover:to-amber-700 focus:ring-4 focus:ring-amber-500/20 disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </span>
          ) : (
            `Pay ${formatIDR(violation.fine_calculation?.total_fine || 0)}`
          )}
        </button>
      </div>
    </div>
  )
}
