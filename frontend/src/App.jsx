import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EventTypes from './pages/EventTypes'
import EventTypeForm from './pages/EventTypeForm'
import Availability from './pages/Availability'
import Bookings from './pages/Bookings'
import Settings from './pages/Settings'
import PublicBooking from './pages/PublicBooking'
import BookingConfirmation from './pages/BookingConfirmation'
import BookingCancel from './pages/BookingCancel'

// Protected route wrapper
function RequireAuth({ children }) {
  const { isAuthenticated, loading, setupRequired } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (setupRequired) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// Redirect if already authenticated
function RedirectIfAuth({ children }) {
  const { isAuthenticated, loading, setupRequired } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (isAuthenticated && !setupRequired) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public booking routes */}
      <Route path="/book" element={<PublicBooking />} />
      <Route path="/book/:slug" element={<PublicBooking />} />
      <Route path="/booking/confirmed/:id" element={<BookingConfirmation />} />
      <Route path="/booking/cancel/:id" element={<BookingCancel />} />
      <Route path="/booking/reschedule/:id" element={<PublicBooking />} />

      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <Login />
          </RedirectIfAuth>
        }
      />

      {/* Protected admin routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
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
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
