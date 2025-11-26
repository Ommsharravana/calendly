import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EventTypes from './pages/EventTypes'
import EventTypeForm from './pages/EventTypeForm'
import Availability from './pages/Availability'
import Bookings from './pages/Bookings'
import Settings from './pages/Settings'
import PublicBooking from './pages/PublicBooking'
import BookingConfirmation from './pages/BookingConfirmation'

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Public booking routes */}
        <Route path="/book" element={<PublicBooking />} />
        <Route path="/book/:slug" element={<PublicBooking />} />
        <Route path="/booking/confirmed/:id" element={<BookingConfirmation />} />

        {/* Admin routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="event-types" element={<EventTypes />} />
          <Route path="event-types/new" element={<EventTypeForm />} />
          <Route path="event-types/:id" element={<EventTypeForm />} />
          <Route path="availability" element={<Availability />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
