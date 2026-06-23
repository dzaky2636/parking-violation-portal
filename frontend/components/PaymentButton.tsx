'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api'
import type { ViolationWithDetails, PaymentResponse } from '@/types'

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
      onPaid?.(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const isPaid = result.status === 'paid'
    return (
      <div className={`overflow-hidden rounded-2xl border ${isPaid ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {isPaid ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.293-5.879-4.293 4.293M3.707 6.121l4.293 4.293M12 15.75h.007v.008H12v-.008Z" />
                )}
              </svg>
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
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
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
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
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
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
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
