import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { getBooking, getSettings } from '../utils/api'

export default function BookingConfirmation() {
  const { id } = useParams()
  const [booking, setBooking] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBookingDetails()
  }, [id])

  const loadBookingDetails = async () => {
    try {
      const [bookingRes, settingsRes] = await Promise.all([
        getBooking(id),
        getSettings(),
      ])
      setBooking(bookingRes.data)
      setSettings(settingsRes.data)
    } catch (error) {
      console.error('Failed to load booking details:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToGoogleCalendar = () => {
    if (!booking) return

    const startTime = new Date(booking.start_time).toISOString().replace(/-|:|\.\d\d\d/g, '')
    const endTime = new Date(booking.end_time).toISOString().replace(/-|:|\.\d\d\d/g, '')

    const url = new URL('https://calendar.google.com/calendar/render')
    url.searchParams.set('action', 'TEMPLATE')
    url.searchParams.set('text', `${booking.event_type_name} with ${settings?.name}`)
    url.searchParams.set('dates', `${startTime}/${endTime}`)
    url.searchParams.set('details', booking.notes || '')
    url.searchParams.set('location', booking.location || '')

    window.open(url.toString(), '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Booking not found</h1>
          <p className="text-gray-600 mb-4">This booking may have been cancelled or removed.</p>
          <Link
            to="/book"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Book a new meeting
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Success header */}
          <div className="bg-green-50 px-6 py-8 text-center border-b border-green-100">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">You're Scheduled!</h1>
            <p className="text-gray-600 mt-2">
              A confirmation email has been sent to {booking.invitee_email}
            </p>
          </div>

          {/* Booking details */}
          <div className="p-6 space-y-4">
            <div
              className="h-2 rounded-full"
              style={{ backgroundColor: booking.event_type_color }}
            />

            <h2 className="text-xl font-semibold text-gray-900">
              {booking.event_type_name}
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <span>With {settings?.name}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <span>{format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                <span>
                  {format(parseISO(booking.start_time), 'h:mm a')} -{' '}
                  {format(parseISO(booking.end_time), 'h:mm a')} ({booking.timezone})
                </span>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <MapPinIcon className="w-5 h-5 text-gray-400" />
                <span>{booking.location}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                <span>{booking.invitee_email}</span>
              </div>

              {booking.notes && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-gray-500 text-xs mb-1">Notes</p>
                  <p className="text-gray-700">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={addToGoogleCalendar}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Add to Google Calendar
            </button>

            <div className="mt-4 text-center">
              <Link
                to="/book"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Schedule another meeting
              </Link>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Need to make changes? Contact {settings?.name} at{' '}
            <a href={`mailto:${settings?.email}`} className="text-primary-600 hover:underline">
              {settings?.email}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
