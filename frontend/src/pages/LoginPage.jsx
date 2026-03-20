import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-2">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">
        Don&apos;t have an account?{' '}
        <Link className="text-amber-400 hover:text-amber-300" to="/register">
          Create one
        </Link>
        .
      </p>

      <form onSubmit={onSubmit} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 flex flex-col gap-3">
        <label className="block">
          <span className="text-sm text-gray-400 mb-1 block">Username</span>
          <input
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-400 mb-1 block">Password</span>
          <input
            type="password"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-950 font-semibold py-2 rounded-lg transition-colors text-sm"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

