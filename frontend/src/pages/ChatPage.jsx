import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { chat, vocab } from '../api'
import { useAuth } from '../auth'

function loadStoredMessages(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function chatDeckStorageKey(userId) {
  return userId ? `germanApp_chat_deck_u${userId}` : 'germanApp_chat_deck_anon'
}

export default function ChatPage() {
  const { user } = useAuth()
  const storageKey = user ? `germanApp_chat_messages_u${user.id}` : 'germanApp_chat_messages_anon'

  const [messages, setMessages] = useState(() => loadStoredMessages(storageKey))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [decks, setDecks] = useState([])
  const [chatDeckId, setChatDeckId] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setMessages(loadStoredMessages(storageKey))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    let active = true
    vocab
      .listDecks()
      .then((data) => {
        if (active) setDecks(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(chatDeckStorageKey(user?.id))
      if (raw !== null) setChatDeckId(raw)
    } catch {
      /* ignore */
    }
  }, [user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  function clearChat() {
    setMessages([])
    localStorage.removeItem(storageKey)
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chat.send({
        message: text,
        history,
        deck_id: chatDeckId ? Number(chatDeckId) : null,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-screen">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold truncate">German Tutor</h1>
          <p className="text-xs text-gray-500">Chat with an AI tutor that knows your vocabulary and grammar</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 border border-gray-600 hover:text-gray-200 hover:border-gray-500 hover:bg-gray-800 transition-colors shrink-0 touch-manipulation min-h-[44px]"
            title="Clear chat"
          >
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-600">
              <p className="text-sm mb-1">No messages yet</p>
              <p className="text-xs">Ask a question about German, request a practice exercise, or just chat!</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-500/15 text-amber-100 border border-amber-500/20'
                  : 'bg-gray-900 text-gray-200 border border-gray-800'
              }`}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&_code]:bg-gray-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-amber-300 [&_pre]:bg-gray-800 [&_pre]:p-3 [&_pre]:rounded-lg"
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <Loader2 size={16} className="animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-800 shrink-0 safe-area-bottom space-y-3">
        <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500">
          <span className="shrink-0">Save new words to</span>
          <select
            value={chatDeckId}
            onChange={(e) => {
              const v = e.target.value
              setChatDeckId(v)
              try {
                localStorage.setItem(chatDeckStorageKey(user?.id), v)
              } catch {
                /* ignore */
              }
            }}
            className="w-full sm:w-auto sm:min-w-[12rem] rounded-lg bg-gray-900 border border-gray-800 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">Without deck</option>
            {decks.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            className="flex-1 min-w-0 rounded-lg bg-gray-900 border border-gray-800 px-4 py-3 text-base text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            placeholder="Ask your tutor anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 px-4 rounded-lg transition-colors touch-manipulation min-h-[44px] shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
