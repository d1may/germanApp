import { Routes, Route, NavLink } from 'react-router-dom'
import { BookOpen, Languages, Layers, MessageCircle } from 'lucide-react'
import VocabularyPage from './pages/VocabularyPage'
import GrammarPage from './pages/GrammarPage'
import FlashcardsPage from './pages/FlashcardsPage'
import ChatPage from './pages/ChatPage'

const NAV = [
  { to: '/', icon: Languages, label: 'Vocabulary' },
  { to: '/grammar', icon: BookOpen, label: 'Grammar' },
  { to: '/flashcards', icon: Layers, label: 'Flashcards' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
]

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-4 gap-1 shrink-0">
        <h1 className="text-lg font-bold mb-4 px-3 text-amber-400 tracking-wide">Deutsch Lernen</h1>
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

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<VocabularyPage />} />
          <Route path="/grammar" element={<GrammarPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  )
}
