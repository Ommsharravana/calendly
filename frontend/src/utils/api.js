import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Settings
export const getSettings = () => api.get('/settings')
export const updateSettings = (data) => api.put('/settings', data)

// Event Types
export const getEventTypes = () => api.get('/event-types')
export const getActiveEventTypes = () => api.get('/event-types/active')
export const getEventType = (id) => api.get(`/event-types/${id}`)
export const getEventTypeBySlug = (slug) => api.get(`/event-types/slug/${slug}`)
export const createEventType = (data) => api.post('/event-types', data)
export const updateEventType = (id, data) => api.put(`/event-types/${id}`, data)
export const deleteEventType = (id) => api.delete(`/event-types/${id}`)

// Availability
export const getAvailability = () => api.get('/availability')
export const updateAvailability = (schedule) => api.put('/availability', { schedule })
export const getAvailabilityOverrides = (startDate, endDate) =>
  api.get('/availability/overrides', { params: { start_date: startDate, end_date: endDate } })
export const createAvailabilityOverride = (data) => api.post('/availability/overrides', data)
export const deleteAvailabilityOverride = (id) => api.delete(`/availability/overrides/${id}`)

// Bookings
export const getBookings = (params) => api.get('/bookings', { params })
export const getUpcomingBookings = () => api.get('/bookings/upcoming')
export const getBooking = (id) => api.get(`/bookings/${id}`)
export const createBooking = (data) => api.post('/bookings', data)
export const cancelBooking = (id, reason) => api.put(`/bookings/${id}/cancel`, { cancellation_reason: reason })
export const rescheduleBooking = (id, data) => api.put(`/bookings/${id}/reschedule`, data)
export const deleteBooking = (id) => api.delete(`/bookings/${id}`)

// Schedule
export const getAvailableSlots = (slug, startDate, endDate, timezone) =>
  api.get(`/schedule/available-slots/${slug}`, {
    params: { start_date: startDate, end_date: endDate, timezone }
  })
export const getCalendarData = (startDate, endDate) =>
  api.get('/schedule/calendar', { params: { start_date: startDate, end_date: endDate } })

export default api
