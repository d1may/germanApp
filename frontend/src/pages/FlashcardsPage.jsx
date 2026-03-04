import { useState } from 'react'
import { flashcards } from '../api'
import { ArrowRight, RotateCcw, Check, X } from 'lucide-react'

export default function FlashcardsPage() {
  const [direction, setDirection] = useState('de_to_en')
  const [card, setCard] = useState(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })

  async function loadNext() {
    setResult(null)
    setAnswer('')
    setError(null)
    setLoading(true)
    try {
      setCard(await flashcards.next({ direction }))
    } catch (e) {
      setError(e.message)
      setCard(null)
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswer(e) {
    e.preventDefault()
    if (!card || !answer.trim()) return
    setLoading(true)
    try {
      const res = await flashcards.answer({ vocabulary_id: card.vocabulary_id, answer: answer.trim() }, direction)
      setResult(res)
      setStats((s) => ({
        correct: s.correct + (res.is_correct ? 1 : 0),
        wrong: s.wrong + (res.is_correct ? 0 : 1),
      }))
    } finally {
      setLoading(false)
    }
  }

  const total = stats.correct + stats.wrong

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Flashcards</h1>

      {/* direction toggle + stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          {[['de_to_en', 'DE → EN'], ['en_to_de', 'EN → DE']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setDirection(val); setCard(null); setResult(null) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                direction === val ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {total > 0 && (
          <div className="text-sm text-gray-500">
            <span className="text-green-400 font-medium">{stats.correct}</span>
            <span className="mx-1">/</span>
            <span className="text-red-400 font-medium">{stats.wrong}</span>
            <span className="ml-1.5 text-gray-600">({total})</span>
          </div>
        )}
      </div>

      {/* start / card */}
      {!card && !error && (
        <button
          onClick={loadNext}
          disabled={loading}
          className="w-full py-12 rounded-xl border-2 border-dashed border-gray-800 text-gray-500 hover:border-amber-500/40 hover:text-amber-400 transition-colors flex flex-col items-center gap-2"
        >
          <Layers size={32} />
          <span className="text-sm font-medium">Start Practice</span>
        </button>
      )}

      {error && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
          <p className="text-gray-400 text-sm mb-3">{error}</p>
          <button onClick={loadNext} className="text-amber-400 text-sm font-medium hover:underline">Try again</button>
        </div>
      )}

      {card && !result && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="px-6 py-8 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{direction === 'de_to_en' ? 'Translate to English' : 'Translate to German'}</p>
            <p className="text-2xl font-bold text-amber-300">{(card.prompt && card.prompt.includes(': ')) ? card.prompt.split(': ')[1] : (direction === 'de_to_en' ? card.word : card.translation)}</p>
          </div>
          <form onSubmit={submitAnswer} className="px-6 pb-6 flex gap-2">
            <input
              autoFocus
              className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="Your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-gray-950 px-4 rounded-lg transition-colors">
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className={`px-6 py-6 text-center ${result.is_correct ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {result.is_correct
                ? <Check size={20} className="text-green-400" />
                : <X size={20} className="text-red-400" />
              }
              <span className={`font-semibold ${result.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                {result.is_correct ? 'Correct!' : 'Wrong'}
              </span>
            </div>
            <p className="text-lg font-bold text-amber-300">{result.word}</p>
          </div>
          <div className="px-6 py-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Correct answer</span>
              <span className="text-gray-200 font-medium">{result.correct_answer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Your answer</span>
              <span className={result.is_correct ? 'text-green-400' : 'text-red-400'}>{result.your_answer}</span>
            </div>
          </div>
          <div className="px-6 pb-5">
            <button
              onClick={loadNext}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              <RotateCcw size={14} /> Next Card
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Layers(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22.4 10.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9" />
      <path d="m22.4 14.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9" />
    </svg>
  )
}
