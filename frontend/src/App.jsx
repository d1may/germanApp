import { Routes, Route, NavLink } from 'react-router-dom'
import { BookOpen, Languages, Layers, List, MessageCircle } from 'lucide-react'
import VocabularyPage from './pages/VocabularyPage'
import GrammarPage from './pages/GrammarPage'
import FlashcardsPage from './pages/FlashcardsPage'
import ChatPage from './pages/ChatPage'
import StrongVerbsPage from './pages/StrongVerbsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './auth'

const NAV = [
  { to: '/', icon: Languages, label: 'Vocabulary' },
  { to: '/grammar', icon: BookOpen, label: 'Grammar' },
  { to: '/strong-verbs', icon: List, label: 'Strong Verbs' },
  { to: '/flashcards', icon: Layers, label: 'Flashcards' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
]

export default function App() {
  const { user, logout, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-gray-900 border-r border-gray-800 flex-col p-4 gap-1 shrink-0">
        <h1 className="text-lg font-bold mb-4 px-3 text-amber-400 tracking-wide">Deutsch Lernen</h1>
        <div className="px-3 mb-3">
          {loading ? (
            <p className="text-xs text-gray-500">Checking session…</p>
          ) : user ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400 truncate">Signed in as <span className="text-gray-200">{user.username}</span></p>
              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-amber-300 transition-colors"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Not signed in</p>
          )}
        </div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-amber-500/15 text-amber-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </aside>

      {/* Mobile header + content */}
      <div className="flex-1 flex flex-col min-h-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
          <h1 className="text-base font-bold text-amber-400 tracking-wide">Deutsch Lernen</h1>
          {!loading && user && (
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-amber-300 transition-colors"
              title="Sign out"
            >
              Sign out
            </button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><VocabularyPage /></ProtectedRoute>} />
            <Route path="/grammar" element={<ProtectedRoute><GrammarPage /></ProtectedRoute>} />
            <Route path="/strong-verbs" element={<ProtectedRoute><StrongVerbsPage /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          </Routes>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around py-2 safe-area-bottom">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 min-w-[4rem] rounded-lg text-xs font-medium transition-colors touch-manipulation ${
                  isActive ? 'text-amber-400' : 'text-gray-500 active:text-gray-300'
                }`
              }
            >
              <Icon size={22} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
