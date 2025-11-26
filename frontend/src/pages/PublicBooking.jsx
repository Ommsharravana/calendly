import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, addDays, startOfDay } from 'date-fns'
import { toast } from 'react-hot-toast'
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import {
  getSettings,
  getActiveEventTypes,
  getEventTypeBySlug,
  getAvailableSlots,
  createBooking,
} from '../utils/api'

export default function PublicBooking() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [settings, setSettings] = useState(null)
  const [eventTypes, setEventTypes] = useState([])
  const [selectedEventType, setSelectedEventType] = useState(null)
  const [loading, setLoading] = useState(true)

  // Booking flow state
  const [step, setStep] = useState('select-event') // select-event, select-time, enter-details
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slots, setSlots] = useState({})
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Calendar state
  const [calendarStart, setCalendarStart] = useState(startOfDay(new Date()))
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [slug])

  useEffect(() => {
    if (selectedEventType) {
      loadSlots()
    }
  }, [selectedEventType, calendarStart])

  const loadInitialData = async () => {
    try {
      const [settingsRes, eventTypesRes] = await Promise.all([
        getSettings(),
        getActiveEventTypes(),
      ])

      setSettings(settingsRes.data)
      setEventTypes(eventTypesRes.data)

      // If slug is provided, load that specific event type
      if (slug) {
        const eventTypeRes = await getEventTypeBySlug(slug)
        setSelectedEventType(eventTypeRes.data)
        setStep('select-time')
      }
    } catch (error) {
      if (slug) {
        toast.error('Event type not found')
        navigate('/book')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadSlots = async () => {
    if (!selectedEventType) return

    setSlotsLoading(true)
    try {
      const startDate = format(calendarStart, 'yyyy-MM-dd')
      const endDate = format(addDays(calendarStart, 13), 'yyyy-MM-dd')

      const response = await getAvailableSlots(
        selectedEventType.slug,
        startDate,
        endDate,
        timezone
      )

      setSlots(response.data.slots)
    } catch (error) {
      toast.error('Failed to load available times')
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleSelectEventType = (eventType) => {
    setSelectedEventType(eventType)
    setStep('select-time')
    navigate(`/book/${eventType.slug}`, { replace: true })
  }

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot)
    setStep('enter-details')
  }

  const handleBack = () => {
    if (step === 'enter-details') {
      setStep('select-time')
      setSelectedSlot(null)
    } else if (step === 'select-time') {
      setStep('select-event')
      setSelectedEventType(null)
      setSelectedDate(null)
      navigate('/book', { replace: true })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email) {
      toast.error('Name and email are required')
      return
    }

    setSubmitting(true)
    try {
      const response = await createBooking({
        event_type_id: selectedEventType.id,
        invitee_name: formData.name,
        invitee_email: formData.email,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        timezone,
        notes: formData.notes,
      })

      navigate(`/booking/confirmed/${response.data.id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to book meeting')
    } finally {
      setSubmitting(false)
    }
  }

  const prevWeek = () => setCalendarStart(addDays(calendarStart, -7))
  const nextWeek = () => setCalendarStart(addDays(calendarStart, 7))

  // Generate calendar days
  const calendarDays = []
  for (let i = 0; i < 14; i++) {
    const date = addDays(calendarStart, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const daySlots = slots[dateStr] || []
    calendarDays.push({
      date,
      dateStr,
      slots: daySlots,
      hasSlots: daySlots.length > 0,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{settings?.name}</h1>
          {settings?.welcome_message && (
            <p className="text-gray-600 mt-2">{settings.welcome_message}</p>
          )}
        </div>

        {/* Step: Select Event Type */}
        {step === 'select-event' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Select a Meeting Type
            </h2>

            {eventTypes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No event types available at the moment.
              </p>
            ) : (
              <div className="space-y-4">
                {eventTypes.map((eventType) => (
                  <button
                    key={eventType.id}
                    onClick={() => handleSelectEventType(eventType)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-2 h-full min-h-[60px] rounded-full"
                        style={{ backgroundColor: eventType.color }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-700">
                          {eventType.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {eventType.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="w-4 h-4" />
                            {eventType.location}
                          </span>
                        </div>
                        {eventType.description && (
                          <p className="text-sm text-gray-600 mt-2">
                            {eventType.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Time */}
        {step === 'select-time' && selectedEventType && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Event type header */}
            <div className="p-6 border-b border-gray-200">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-start gap-4">
                <div
                  className="w-2 h-16 rounded-full"
                  style={{ backgroundColor: selectedEventType.color }}
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedEventType.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {selectedEventType.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {selectedEventType.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Select a Date & Time</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevWeek}
                    disabled={calendarStart <= startOfDay(new Date())}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600 w-32 text-center">
                    {format(calendarStart, 'MMM d')} - {format(addDays(calendarStart, 13), 'MMM d')}
                  </span>
                  <button
                    onClick={nextWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {slotsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {calendarDays.slice(0, 7).map((day) => (
                    <div key={`header-${day.dateStr}`} className="text-center text-xs font-medium text-gray-500 pb-2">
                      {format(day.date, 'EEE')}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {calendarDays.map((day) => (
                    <button
                      key={day.dateStr}
                      onClick={() => day.hasSlots && setSelectedDate(day.dateStr)}
                      disabled={!day.hasSlots}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        selectedDate === day.dateStr
                          ? 'bg-primary-600 text-white'
                          : day.hasSlots
                          ? 'hover:bg-primary-50 text-gray-900'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-sm font-medium">{format(day.date, 'd')}</div>
                      {day.hasSlots && (
                        <div className="text-xs mt-1 opacity-75">
                          {day.slots.length} slots
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Time slots */}
              {selectedDate && slots[selectedDate] && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Available times for {format(parseISO(selectedDate), 'EEEE, MMMM d')}
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {slots[selectedDate].map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => handleSelectSlot(slot)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      >
                        {slot.formatted}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-6">
                Times shown in {timezone}
              </p>
            </div>
          </div>
        )}

        {/* Step: Enter Details */}
        {step === 'enter-details' && selectedSlot && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-start gap-4">
                <div
                  className="w-2 h-20 rounded-full"
                  style={{ backgroundColor: selectedEventType.color }}
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedEventType.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {selectedEventType.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {selectedEventType.location}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-primary-600">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    {format(parseISO(selectedSlot.start), 'EEEE, MMMM d, yyyy')} at{' '}
                    {format(parseISO(selectedSlot.start), 'h:mm a')}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">Enter Your Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Please share anything that will help prepare for our meeting."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
