import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, setup, setupRequired } = useAuth()

  const [isSetup, setIsSetup] = useState(setupRequired)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      toast.error('Email and password are required')
      return
    }

    if (isSetup && formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      if (isSetup) {
        await setup(formData.email, formData.password, formData.name)
        toast.success('Account created successfully!')
      } else {
        await login(formData.email, formData.password)
        toast.success('Welcome back!')
      }
      navigate(from, { replace: true })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <CalendarIcon className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Calendly Clone</h1>
          <p className="text-gray-600 mt-2">
            {isSetup ? 'Create your admin account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSetup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={isSetup ? 'Min. 8 characters' : '••••••••'}
                required
                minLength={isSetup ? 8 : undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSetup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {!setupRequired && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsSetup(!isSetup)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {isSetup ? 'Already have an account? Sign in' : 'Need to set up? Create account'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <a href="/book" className="text-primary-600 hover:text-primary-700">
            View public booking page
          </a>
        </p>
      </div>
    </div>
  )
}
