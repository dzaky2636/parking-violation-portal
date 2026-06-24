'use client'

import { useState } from 'react'
import { apiPostForm } from '@/lib/api'
import type { Violation } from '@/types'
import { AlertTriangle, ImageIcon, Loader2, ShieldAlert } from 'lucide-react'

const VIOLATION_TYPES = [
  { value: 'expired_meter', label: 'Expired Meter', description: 'Parking meter expired' },
  { value: 'no_parking_zone', label: 'No Parking Zone', description: 'Vehicle in restricted area' },
  { value: 'blocking_hydrant', label: 'Blocking Hydrant', description: 'Obstructing fire hydrant' },
  { value: 'disabled_spot', label: 'Disabled Spot', description: 'Unauthorized use of accessible parking' },
]

export default function ViolationForm({ onSuccess }: { onSuccess?: (v: Violation) => void }) {
  const [plate, setPlate] = useState('')
  const [type, setType] = useState('expired_meter')
  const [location, setLocation] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('plate', plate)
    formData.append('violation_type', type)
    formData.append('location', location)
    formData.append('violation_timestamp', new Date(timestamp).toISOString())
    if (photo) {
      formData.append('photo', photo)
    }

    try {
      const violation = await apiPostForm<Violation>('/api/violations', formData)
      setPlate('')
      setLocation('')
      setTimestamp('')
      setPhoto(null)
      setPhotoName('')
      onSuccess?.(violation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit violation')
    } finally {
      setLoading(false)
    }
  }

  const selectedType = VIOLATION_TYPES.find((t) => t.value === type)

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Submit Violation</h2>
            <p className="text-sm text-slate-500">Record a new parking violation for processing</p>
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">License Plate</label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm uppercase tracking-wide text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="B 1234 XYZ"
              />
              <p className="mt-1 text-xs text-slate-500">Indonesian plate format, e.g. B 1234 XYZ</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Jl. Sudirman No. 123"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Timestamp</label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Violation Type</label>
              <div className="space-y-2">
                {VIOLATION_TYPES.map((vt) => (
                  <label
                    key={vt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      type === vt.value
                        ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="violation_type"
                      value={vt.value}
                      checked={type === vt.value}
                      onChange={() => setType(vt.value)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-slate-900">{vt.label}</span>
                      <span className="block text-xs text-slate-500">{vt.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Evidence Photo</label>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-slate-400 hover:bg-slate-100">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setPhoto(file)
                    setPhotoName(file?.name || '')
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-200"
                />
                {photoName && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <ImageIcon className="h-4 w-4 text-indigo-500" />
                    {photoName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => {
              setPlate('')
              setType('expired_meter')
              setLocation('')
              setTimestamp('')
              setPhoto(null)
              setPhotoName('')
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Violation'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
