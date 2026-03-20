import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500 max-w-5xl mx-auto">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

