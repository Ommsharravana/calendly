import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { getUpcomingBookings, getEventTypes, getBookings } from '../utils/api'

export default function Dashboard() {
  const [upcomingBookings, setUpcomingBookings] = useState([])
  const [stats, setStats] = useState({
    totalEventTypes: 0,
    upcomingCount: 0,
    thisMonthCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [bookingsRes, eventTypesRes, allBookingsRes] = await Promise.all([
        getUpcomingBookings(),
        getEventTypes(),
        getBookings({
          start_date: format(new Date(), 'yyyy-MM-01'),
          end_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'confirmed'
        })
      ])

      setUpcomingBookings(bookingsRes.data)
      setStats({
        totalEventTypes: eventTypesRes.data.length,
        upcomingCount: bookingsRes.data.length,
        thisMonthCount: allBookingsRes.data.length,
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Event Types',
      value: stats.totalEventTypes,
      icon: ClockIcon,
      color: 'bg-blue-500',
      link: '/event-types',
    },
    {
      name: 'Upcoming Meetings',
      value: stats.upcomingCount,
      icon: CalendarDaysIcon,
      color: 'bg-green-500',
      link: '/bookings',
    },
    {
      name: 'This Month',
      value: stats.thisMonthCount,
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      link: '/bookings',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to your scheduling dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h2>
          <Link
            to="/bookings"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
          >
            View all <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming meetings</p>
            <p className="text-gray-400 text-sm mt-1">
              Share your booking link to start receiving meetings
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-3 h-12 rounded-full"
                    style={{ backgroundColor: booking.event_type_color }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{booking.invitee_name}</p>
                    <p className="text-sm text-gray-500">{booking.event_type_name}</p>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/event-types/new"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 p-3 rounded-lg group-hover:bg-primary-200 transition-colors">
              <ClockIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Event Type</p>
              <p className="text-sm text-gray-500">Add a new type of meeting</p>
            </div>
          </div>
        </Link>

        <a
          href="/book"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
              <CalendarDaysIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Booking Page</p>
              <p className="text-sm text-gray-500">See what invitees see</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}
