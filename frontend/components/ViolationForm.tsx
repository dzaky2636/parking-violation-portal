'use client'

import { useState } from 'react'
import { apiPostForm } from '@/lib/api'
import type { Violation } from '@/types'

const VIOLATION_TYPES = [
  { value: 'expired_meter', label: 'Expired Meter' },
  { value: 'no_parking_zone', label: 'No Parking Zone' },
  { value: 'blocking_hydrant', label: 'Blocking Hydrant' },
  { value: 'disabled_spot', label: 'Disabled Spot' },
]

export default function ViolationForm({ onSuccess }: { onSuccess?: (v: Violation) => void }) {
  const [plate, setPlate] = useState('')
  const [type, setType] = useState('expired_meter')
  const [location, setLocation] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
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
      onSuccess?.(violation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit violation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Submit Violation</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">License Plate</label>
          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            placeholder="B 1234 XYZ"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Violation Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          >
            {VIOLATION_TYPES.map((vt) => (
              <option key={vt.value} value={vt.value}>{vt.label}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            placeholder="Jl. Sudirman No. 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Timestamp</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Submitting...' : 'Submit Violation'}
      </button>
    </form>
  )
}
