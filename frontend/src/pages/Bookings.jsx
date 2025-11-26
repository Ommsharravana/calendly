import { useState, useEffect } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { toast } from 'react-hot-toast'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { getBookings, cancelBooking } from '../utils/api'

const statusColors = {
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filter, setFilter] = useState('all') // all, confirmed, cancelled
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    loadBookings()
  }, [currentMonth, filter])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const params = {
        start_date: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
      }
      if (filter !== 'all') {
        params.status = filter
      }
      const response = await getBookings(params)
      setBookings(response.data)
    } catch (error) {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (bookingId) => {
    const reason = prompt('Cancellation reason (optional):')
    if (reason === null) return // User clicked cancel

    try {
      await cancelBooking(bookingId, reason)
      toast.success('Booking cancelled')
      loadBookings()
      setSelectedBooking(null)
    } catch (error) {
      toast.error('Failed to cancel booking')
    }
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600 mt-1">View and manage your scheduled meetings</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 w-40 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bookings found for this month</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-3 h-12 rounded-full"
                    style={{ backgroundColor: booking.event_type_color }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{booking.invitee_name}</p>
                    <p className="text-sm text-gray-500">{booking.event_type_name}</p>
                    <p className="text-sm text-gray-400">{booking.invitee_email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {format(parseISO(booking.start_time), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(booking.start_time), 'h:mm a')} -{' '}
                    {format(parseISO(booking.end_time), 'h:mm a')}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                      statusColors[booking.status]
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div
                className="h-2 rounded-full"
                style={{ backgroundColor: selectedBooking.event_type_color }}
              />

              <div>
                <p className="text-sm text-gray-500">Event</p>
                <p className="font-medium text-gray-900">{selectedBooking.event_type_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Invitee</p>
                <p className="font-medium text-gray-900">{selectedBooking.invitee_name}</p>
                <p className="text-sm text-gray-600">{selectedBooking.invitee_email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-medium text-gray-900">
                  {format(parseISO(selectedBooking.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(parseISO(selectedBooking.start_time), 'h:mm a')} -{' '}
                  {format(parseISO(selectedBooking.end_time), 'h:mm a')}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium text-gray-900">{selectedBooking.location}</p>
              </div>

              {selectedBooking.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-900">{selectedBooking.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
                    statusColors[selectedBooking.status]
                  }`}
                >
                  {selectedBooking.status}
                </span>
                {selectedBooking.cancellation_reason && (
                  <p className="text-sm text-gray-500 mt-1">
                    Reason: {selectedBooking.cancellation_reason}
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              {selectedBooking.status === 'confirmed' && (
                <button
                  onClick={() => handleCancel(selectedBooking.id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  Cancel Booking
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
