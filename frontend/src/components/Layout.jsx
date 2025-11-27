import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  CalendarDaysIcon,
  ClockIcon,
  Cog6ToothIcon,
  HomeIcon,
  LinkIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Event Types', href: '/event-types', icon: LinkIcon },
  { name: 'Availability', href: '/availability', icon: ClockIcon },
  { name: 'Bookings', href: '/bookings', icon: CalendarDaysIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
          <CalendarIcon className="w-8 h-8 text-primary-600" />
          <span className="text-xl font-bold text-gray-900">Calendly Clone</span>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-4 flex-1">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* User info */}
          {user && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name || user.email}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}

          {/* Public link */}
          <a
            href="/book"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            View Public Page
          </a>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
