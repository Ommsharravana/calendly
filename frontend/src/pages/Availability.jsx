import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getAvailability, updateAvailability } from '../utils/api'

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, '0')
    const min = m.toString().padStart(2, '0')
    const time = `${hour}:${min}`
    const label = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    TIME_OPTIONS.push({ value: time, label })
  }
}

export default function Availability() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAvailability()
  }, [])

  const loadAvailability = async () => {
    try {
      const response = await getAvailability()
      // Transform to array indexed by day
      const byDay = {}
      response.data.forEach((slot) => {
        byDay[slot.day_of_week] = {
          ...slot,
          is_available: Boolean(slot.is_available),
        }
      })

      // Ensure all days are present
      const fullSchedule = DAYS.map((day) => {
        if (byDay[day.value]) {
          return byDay[day.value]
        }
        return {
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '17:00',
          is_available: day.value >= 1 && day.value <= 5,
        }
      })

      setSchedule(fullSchedule)
    } catch (error) {
      toast.error('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDay = (dayIndex) => {
    setSchedule((prev) =>
      prev.map((slot) =>
        slot.day_of_week === dayIndex
          ? { ...slot, is_available: !slot.is_available }
          : slot
      )
    )
  }

  const handleTimeChange = (dayIndex, field, value) => {
    setSchedule((prev) =>
      prev.map((slot) =>
        slot.day_of_week === dayIndex ? { ...slot, [field]: value } : slot
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAvailability(schedule)
      toast.success('Availability saved')
    } catch (error) {
      toast.error('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        <p className="text-gray-600 mt-1">Set your weekly hours for meetings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {schedule.map((slot) => {
            const day = DAYS.find((d) => d.value === slot.day_of_week)
            return (
              <div
                key={slot.day_of_week}
                className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
              >
                {/* Day toggle */}
                <label className="flex items-center gap-3 w-32">
                  <input
                    type="checkbox"
                    checked={slot.is_available}
                    onChange={() => handleToggleDay(slot.day_of_week)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span
                    className={`font-medium ${
                      slot.is_available ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {day.label}
                  </span>
                </label>

                {/* Time range */}
                {slot.is_available ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={slot.start_time}
                      onChange={(e) =>
                        handleTimeChange(slot.day_of_week, 'start_time', e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-500">-</span>
                    <select
                      value={slot.end_time}
                      onChange={(e) =>
                        handleTimeChange(slot.day_of_week, 'end_time', e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Unavailable</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Your availability applies to all event types by default</li>
          <li>- Times are in your local timezone</li>
          <li>- Buffer times between meetings are set per event type</li>
        </ul>
      </div>
    </div>
  )
}
