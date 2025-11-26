import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { getEventTypes, deleteEventType, updateEventType } from '../utils/api'

export default function EventTypes() {
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEventTypes()
  }, [])

  const loadEventTypes = async () => {
    try {
      const response = await getEventTypes()
      setEventTypes(response.data)
    } catch (error) {
      toast.error('Failed to load event types')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      await deleteEventType(id)
      setEventTypes(eventTypes.filter((e) => e.id !== id))
      toast.success('Event type deleted')
    } catch (error) {
      toast.error('Failed to delete event type')
    }
  }

  const handleToggleActive = async (eventType) => {
    try {
      await updateEventType(eventType.id, { is_active: eventType.is_active ? 0 : 1 })
      setEventTypes(
        eventTypes.map((e) =>
          e.id === eventType.id ? { ...e, is_active: e.is_active ? 0 : 1 } : e
        )
      )
      toast.success(eventType.is_active ? 'Event type disabled' : 'Event type enabled')
    } catch (error) {
      toast.error('Failed to update event type')
    }
  }

  const copyLink = (slug) => {
    const url = `${window.location.origin}/book/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Types</h1>
          <p className="text-gray-600 mt-1">Create and manage your meeting types</p>
        </div>
        <Link
          to="/event-types/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Event Type
        </Link>
      </div>

      {eventTypes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No event types yet</h3>
          <p className="text-gray-500 mb-6">Create your first event type to start accepting bookings</p>
          <Link
            to="/event-types/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Event Type
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventTypes.map((eventType) => (
            <div
              key={eventType.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${
                !eventType.is_active ? 'opacity-60' : ''
              }`}
            >
              <div
                className="h-2"
                style={{ backgroundColor: eventType.color }}
              />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {eventType.name}
                      {!eventType.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Disabled
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{eventType.duration} min</p>
                  </div>
                </div>

                {eventType.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {eventType.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <span className="px-2 py-1 bg-gray-100 rounded">{eventType.location}</span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => copyLink(eventType.slug)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy Link
                  </button>
                  <Link
                    to={`/event-types/${eventType.id}`}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleToggleActive(eventType)}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title={eventType.is_active ? 'Disable' : 'Enable'}
                  >
                    <EyeSlashIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(eventType.id, eventType.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
