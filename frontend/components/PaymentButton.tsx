'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api'
import type { ViolationWithDetails, PaymentResponse } from '@/types'

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
    return (
      <div className={`p-4 rounded-lg ${result.status === 'paid' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <p className={`text-sm font-medium ${result.status === 'paid' ? 'text-green-800' : 'text-red-800'}`}>
          Payment {result.status === 'paid' ? 'successful' : 'failed'}
        </p>
        <p className="text-xs text-zinc-500 mt-1">Transaction ID: {result.transaction_id}</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">
        Pay Fine — Rp {violation.fine_calculation?.total_fine.toLocaleString('id-ID')}
      </h3>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 mb-2">Test Scenario</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scenario"
              value="success"
              checked={scenario === 'success'}
              onChange={() => setScenario('success')}
              className="text-zinc-900"
            />
            Success
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scenario"
              value="failed"
              checked={scenario === 'failed'}
              onChange={() => setScenario('failed')}
              className="text-zinc-900"
            />
            Failed
          </label>
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  )
}
