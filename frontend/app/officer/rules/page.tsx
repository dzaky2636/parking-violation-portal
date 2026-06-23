'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet } from '@/lib/api'
import type { FineRuleWithDetails } from '@/types'

export default function RulesPage() {
  const [rules, setRules] = useState<FineRuleWithDetails[]>([])
  const [active, setActive] = useState<FineRuleWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      apiGet<FineRuleWithDetails[]>('/api/rules'),
      apiGet<FineRuleWithDetails>('/api/rules/active'),
    ])
      .then(([allRules, activeRule]) => {
        setRules(allRules)
        setActive(activeRule)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load rules'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-zinc-400">Loading...</p>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Fine Rules</h1>
          <p className="text-sm text-zinc-500">Manage fine calculation rules.</p>
        </div>
        <button
          onClick={() => router.push('/officer/rules/new')}
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          New Rule Version
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {active && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            Active Rule — Version {active.version}
            <span className="ml-2 text-xs text-zinc-400 font-normal">
              (effective {new Date(active.effective_from).toLocaleDateString()})
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 px-3 font-medium text-zinc-500">Type</th>
                  <th className="text-right py-2 px-3 font-medium text-zinc-500">Base Amount</th>
                  <th className="text-center py-2 px-3 font-medium text-zinc-500">Time Window</th>
                  <th className="text-center py-2 px-3 font-medium text-zinc-500">Time Mult</th>
                  <th className="text-center py-2 px-3 font-medium text-zinc-500">Min Repeats</th>
                  <th className="text-center py-2 px-3 font-medium text-zinc-500">Repeat Mult</th>
                </tr>
              </thead>
              <tbody>
                {active.details.map((d) => (
                  <tr key={d.id} className="border-b border-zinc-100">
                    <td className="py-2 px-3 capitalize">{d.violation_type.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-3 text-right">Rp {d.base_amount.toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3 text-center">{d.time_multiplier_start}–{d.time_multiplier_end}</td>
                    <td className="py-2 px-3 text-center">{d.time_multiplier_value}x</td>
                    <td className="py-2 px-3 text-center">{d.repeat_count_min}</td>
                    <td className="py-2 px-3 text-center">{d.repeat_multiplier}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Version History</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-zinc-400">No rule versions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-3 px-4 font-medium text-zinc-500">Version</th>
                <th className="text-left py-3 px-4 font-medium text-zinc-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-zinc-500">Effective From</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100">
                  <td className="py-3 px-4 font-medium text-zinc-900">v{r.version}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-600">{new Date(r.effective_from).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
