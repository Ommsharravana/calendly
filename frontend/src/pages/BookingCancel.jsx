import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { toast } from 'react-hot-toast'
import {
  XCircleIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import api from '../utils/api'

export default function BookingCancel() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    loadBooking()
  }, [id, token])

  const loadBooking = async () => {
    try {
      const response = await api.get(`/bookings/${id}?token=${token}`)
      setBooking(response.data)

      if (response.data.status === 'cancelled') {
        setCancelled(true)
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to load booking')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setCancelling(true)
    try {
      await api.post(`/bookings/${id}/cancel-public`, {
        token,
        cancellation_reason: reason || undefined,
      })
      setCancelled(true)
      toast.success('Booking cancelled successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Booking</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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

  if (cancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your booking has been successfully cancelled.
          </p>
          <Link
            to="/book"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Book a new meeting
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100">
            <h1 className="text-xl font-bold text-gray-900">Cancel Booking</h1>
            <p className="text-gray-600 text-sm mt-1">
              Are you sure you want to cancel this meeting?
            </p>
          </div>

          <div className="p-6">
            {booking && (
              <div className="space-y-4 mb-6">
                <h2 className="font-semibold text-gray-900">
                  {booking.event_type_name}
                </h2>

                <div className="flex items-center gap-3 text-gray-600 text-sm">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  <span>{format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}</span>
                </div>

                <div className="flex items-center gap-3 text-gray-600 text-sm">
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <span>
                    {format(parseISO(booking.start_time), 'h:mm a')} -{' '}
                    {format(parseISO(booking.end_time), 'h:mm a')}
                  </span>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Let us know why you're cancelling..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex gap-3">
              <Link
                to="/book"
                className="flex-1 py-2 text-center text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Keep Booking
              </Link>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
