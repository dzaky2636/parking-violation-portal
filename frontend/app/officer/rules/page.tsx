'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet } from '@/lib/api'
import type { FineRuleWithDetails } from '@/types'
import { Loader2, Plus, AlertTriangle, CircleCheck, Clock } from 'lucide-react'

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading rules...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fine Rules</h1>
          <p className="mt-1 text-sm text-slate-500">Manage fine calculation rules and version history.</p>
        </div>
        <button
          onClick={() => router.push('/officer/rules/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20"
        >
          <Plus className="h-4 w-4" />
          New Rule Version
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {active && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CircleCheck className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Active Rule — Version {active.version}</h2>
                  <p className="text-sm text-slate-500">
                    Effective from {new Date(active.effective_from).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 text-right font-semibold">Base Amount</th>
                  <th className="px-6 py-3 text-center font-semibold">Time Window</th>
                  <th className="px-6 py-3 text-center font-semibold">Time Mult</th>
                  <th className="px-6 py-3 text-center font-semibold">Min Repeats</th>
                  <th className="px-6 py-3 text-center font-semibold">Repeat Mult</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.details.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-3">
                      <span className="capitalize text-slate-700">{d.violation_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-slate-900">{formatIDR(d.base_amount)}</td>
                    <td className="px-6 py-3 text-center text-slate-600">{d.time_multiplier_start}–{d.time_multiplier_end}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{d.time_multiplier_value}x</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">≥ {d.repeat_count_min}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{d.repeat_multiplier}x</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Version History</h2>
        </div>
        {rules.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No rule versions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-semibold">Version</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Effective From</th>
                  <th className="px-6 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">v{r.version}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        r.status === 'active'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}>
                        {r.status === 'active' ? <CircleCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{new Date(r.effective_from).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-3 text-slate-600">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
