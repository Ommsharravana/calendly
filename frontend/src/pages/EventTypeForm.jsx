import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getEventType, createEventType, updateEventType } from '../utils/api'

const colorOptions = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

const locationOptions = [
  'Google Meet',
  'Zoom',
  'Microsoft Teams',
  'Phone Call',
  'In Person',
  'Custom',
]

export default function EventTypeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    duration: 30,
    color: '#3B82F6',
    location: 'Google Meet',
    buffer_before: 0,
    buffer_after: 0,
    max_bookings_per_day: '',
  })

  useEffect(() => {
    if (isEditing) {
      loadEventType()
    }
  }, [id])

  const loadEventType = async () => {
    try {
      const response = await getEventType(id)
      const et = response.data
      setFormData({
        name: et.name,
        slug: et.slug,
        description: et.description || '',
        duration: et.duration,
        color: et.color,
        location: et.location,
        buffer_before: et.buffer_before || 0,
        buffer_after: et.buffer_after || 0,
        max_bookings_per_day: et.max_bookings_per_day || '',
      })
    } catch (error) {
      toast.error('Failed to load event type')
      navigate('/event-types')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Auto-generate slug from name
    if (name === 'name' && !isEditing) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.slug) {
      toast.error('Name and URL slug are required')
      return
    }

    setSaving(true)
    try {
      const data = {
        ...formData,
        duration: parseInt(formData.duration),
        buffer_before: parseInt(formData.buffer_before) || 0,
        buffer_after: parseInt(formData.buffer_after) || 0,
        max_bookings_per_day: formData.max_bookings_per_day
          ? parseInt(formData.max_bookings_per_day)
          : null,
      }

      if (isEditing) {
        await updateEventType(id, data)
        toast.success('Event type updated')
      } else {
        await createEventType(data)
        toast.success('Event type created')
      }
      navigate('/event-types')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save event type')
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
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/event-types')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Event Types
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          {isEditing ? 'Edit Event Type' : 'Create Event Type'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., 30 Minute Meeting"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug *
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-2">/book/</span>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="30min"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of this meeting type"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex items-center gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Buffer Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Before (minutes)
              </label>
              <input
                type="number"
                name="buffer_before"
                value={formData.buffer_before}
                onChange={handleChange}
                min={0}
                max={60}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer After (minutes)
              </label>
              <input
                type="number"
                name="buffer_after"
                value={formData.buffer_after}
                onChange={handleChange}
                min={0}
                max={60}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Max Bookings Per Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Bookings Per Day (optional)
            </label>
            <input
              type="number"
              name="max_bookings_per_day"
              value={formData.max_bookings_per_day}
              onChange={handleChange}
              min={1}
              placeholder="Unlimited"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event Type'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/event-types')}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
