'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api'
import type { FineRuleWithDetails } from '@/types'

const DEFAULT_TYPES = ['expired_meter', 'no_parking_zone', 'blocking_hydrant', 'disabled_spot']

export default function NewRulePage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [baseAmounts, setBaseAmounts] = useState(
    DEFAULT_TYPES.map((t) => ({ violation_type: t, amount: 0 }))
  )
  const [timeMultipliers, setTimeMultipliers] = useState([
    { start: '06:00', end: '22:00', value: 1.0 },
    { start: '22:00', end: '06:00', value: 1.5 },
  ])
  const [repeatMultipliers, setRepeatMultipliers] = useState([
    { min_count: 0, multiplier: 1.0 },
    { min_count: 1, multiplier: 1.5 },
    { min_count: 2, multiplier: 2.0 },
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await apiPost<FineRuleWithDetails>('/api/rules', {
        base_amounts: baseAmounts,
        time_multipliers: timeMultipliers,
        repeat_multipliers: repeatMultipliers,
      })
      router.push('/officer/rules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Rule Version</h1>
        <p className="mt-1 text-sm text-slate-500">Publishing a new version will supersede the current active rule.</p>
      </div>

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="m-6 mb-0 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        <div className="p-6 space-y-8">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Base Amounts</h2>
                <p className="text-xs text-slate-500">Fine amount per violation type in IDR</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {baseAmounts.map((ba, i) => (
                <div key={ba.violation_type} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 capitalize">
                    {ba.violation_type.replace(/_/g, ' ')}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-slate-500">Rp</span>
                    <input
                      type="number"
                      value={ba.amount}
                      onChange={(e) => {
                        const next = [...baseAmounts]
                        next[i] = { ...next[i], amount: Number(e.target.value) }
                        setBaseAmounts(next)
                      }}
                      required
                      min="0"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Time Multipliers</h2>
                <p className="text-xs text-slate-500">Multiplier based on violation time of day</p>
              </div>
            </div>
            <div className="space-y-3">
              {timeMultipliers.map((tm, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <input
                    type="time"
                    value={tm.start}
                    onChange={(e) => {
                      const next = [...timeMultipliers]
                      next[i] = { ...next[i], start: e.target.value }
                      setTimeMultipliers(next)
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <span className="text-sm text-slate-400">to</span>
                  <input
                    type="time"
                    value={tm.end}
                    onChange={(e) => {
                      const next = [...timeMultipliers]
                      next[i] = { ...next[i], end: e.target.value }
                      setTimeMultipliers(next)
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <span className="text-sm text-slate-400">×</span>
                  <input
                    type="number"
                    value={tm.value}
                    onChange={(e) => {
                      const next = [...timeMultipliers]
                      next[i] = { ...next[i], value: Number(e.target.value) }
                      setTimeMultipliers(next)
                    }}
                    step="0.1"
                    min="0"
                    className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Repeat Multipliers</h2>
                <p className="text-xs text-slate-500">Multiplier based on prior unpaid violations on same plate</p>
              </div>
            </div>
            <div className="space-y-3">
              {repeatMultipliers.map((rm, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <span className="w-24 text-sm text-slate-600">≥ {rm.min_count} prior</span>
                  <span className="text-sm text-slate-400">×</span>
                  <input
                    type="number"
                    value={rm.multiplier}
                    onChange={(e) => {
                      const next = [...repeatMultipliers]
                      next[i] = { ...next[i], multiplier: Number(e.target.value) }
                      setRepeatMultipliers(next)
                    }}
                    step="0.1"
                    min="0"
                    className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            onClick={() => router.push('/officer/rules')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Publishing...
              </span>
            ) : (
              'Publish New Version'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
