'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api'
import type { CreateRuleRequest, FineRuleWithDetails } from '@/types'

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

    const body: CreateRuleRequest = {
      base_amounts: baseAmounts,
      time_multipliers: timeMultipliers,
      repeat_multipliers: repeatMultipliers,
    }

    try {
      await apiPost<FineRuleWithDetails>('/api/rules', body)
      router.push('/officer/rules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">New Rule Version</h1>
        <p className="text-sm text-zinc-500">Creating a new version will supersede the current active rule.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Base Amounts (IDR)</h3>
          <div className="space-y-2">
            {baseAmounts.map((ba, i) => (
              <div key={ba.violation_type} className="flex items-center gap-3">
                <label className="w-40 text-sm text-zinc-600 capitalize">{ba.violation_type.replace(/_/g, ' ')}</label>
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
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Time Multipliers</h3>
          <div className="space-y-2">
            {timeMultipliers.map((tm, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="time"
                  value={tm.start}
                  onChange={(e) => {
                    const next = [...timeMultipliers]
                    next[i] = { ...next[i], start: e.target.value }
                    setTimeMultipliers(next)
                  }}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
                <span className="text-zinc-400">to</span>
                <input
                  type="time"
                  value={tm.end}
                  onChange={(e) => {
                    const next = [...timeMultipliers]
                    next[i] = { ...next[i], end: e.target.value }
                    setTimeMultipliers(next)
                  }}
                  className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
                <span className="text-zinc-400">×</span>
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
                  className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Repeat Multipliers</h3>
          <div className="space-y-2">
            {repeatMultipliers.map((rm, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 w-32">≥ {rm.min_count} prior</span>
                <span className="text-zinc-400">×</span>
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
                  className="w-20 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/officer/rules')}
            className="flex-1 py-2.5 px-4 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Publishing...' : 'Publish New Version'}
          </button>
        </div>
      </form>
    </div>
  )
}
