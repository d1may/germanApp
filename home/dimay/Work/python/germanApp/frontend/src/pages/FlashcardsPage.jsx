import { useState } from 'react'
import { flashcards } from '../api'
import { ArrowRight, RotateCcw, Check, X } from 'lucide-react'
import { STRONG_VERBS, partizipDisplay } from '../data/strongVerbs'

const CEFR_TAGS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const COMMON_TAGS = ['animals', 'food', 'verbs', 'nouns', 'adjectives']

export default function FlashcardsPage() {
  const [mode, setMode] = useState('vocabulary') // vocabulary | strong_verbs
  const [tagFilter, setTagFilter] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [direction, setDirection] = useState('de_to_en')
  const [card, setCard] = useState(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [verbQuestionType, setVerbQuestionType] = useState('partizip') // partizip | praeteritum

  const effectiveTag = customTag.trim() || tagFilter

  function resetCard() {
    setCard(null)
    setResult(null)
    setAnswer('')
  }

  async function loadNextVocabulary() {
    setLoading(true)
    setError(null)
    try {
      const params = { direction }
      if (effectiveTag) params.tag = effectiveTag
      setCard(await flashcards.next(params))
    } catch (e) {
      setError(e.message)
      setCard(null)
    } finally {
      setLoading(false)
    }
  }

  function loadNextStrongVerb() {
    const idx = Math.floor(Math.random() * STRONG_VERBS.length)
    const v = STRONG_VERBS[idx]
    const expected = verbQuestionType === 'partizip' ? partizipDisplay(v) : v.praeteritum
    setCard({ ...v, expected, type: 'strong_verb' })
    setError(null)
  }

  function loadNext() {
    setResult(null)
    setAnswer('')
    if (mode === 'strong_verbs') {
      loadNextStrongVerb()
    } else {
      loadNextVocabulary()
    }
  }

  async function submitVocabularyAnswer(e) {
    e.preventDefault()
    if (!card || !answer.trim() || card.type === 'strong_verb') return
    setLoading(true)
    try {
      const res = await flashcards.answer(
        { vocabulary_id: card.vocabulary_id, answer: answer.trim() },
        direction
      )
      setResult({ ...res, type: 'vocabulary' })
      setStats((s) => ({
        correct: s.correct + (res.is_correct ? 1 : 0),
        wrong: s.wrong + (res.is_correct ? 0 : 1),
      }))
    } finally {
      setLoading(false)
    }
  }

  function submitStrongVerbAnswer(e) {
    e.preventDefault()
    if (!card || !answer.trim() || card.type !== 'strong_verb') return
    const isCorrect = answer.trim().toLowerCase() === card.expected.toLowerCase()
    setResult({
      vocabulary_id: 0,
      word: card.infinitive,
      correct_answer: card.expected,
      your_answer: answer.trim(),
      is_correct: isCorrect,
      correct_count: 0,
      wrong_count: 0,
      type: 'strong_verb',
    })
    setStats((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      wrong: s.wrong + (isCorrect ? 0 : 1),
    }))
  }

  function handleSubmit(e) {
    if (mode === 'strong_verbs') submitStrongVerbAnswer(e)
    else submitVocabularyAnswer(e)
  }

  const total = stats.correct + stats.wrong

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4 md:mb-6">Flashcards</h1>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800 mb-4">
        {[
          ['vocabulary', 'Vocabulary'],
          ['strong_verbs', 'Strong Verbs'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setMode(val); resetCard(); setError(null) }}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
              mode === val ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {mode === 'vocabulary' && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-gray-500">Filter by tag</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setTagFilter(''); setCustomTag(''); resetCard() }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !effectiveTag ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              All
            </button>
            {CEFR_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => { setTagFilter(t); setCustomTag(''); resetCard() }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tagFilter === t ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
            {COMMON_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => { setTagFilter(t); setCustomTag(''); resetCard() }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tagFilter === t ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
            <input
              type="text"
              placeholder="Custom tag..."
              value={customTag}
              onChange={(e) => { setCustomTag(e.target.value); setTagFilter(''); resetCard() }}
              className="w-28 px-2 py-1.5 rounded-md text-xs bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>
        </div>
      )}

      {mode === 'strong_verbs' && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Ask for</p>
          <div className="flex gap-1">
            {[
              ['partizip', 'Partizip II'],
              ['praeteritum', 'Präteritum'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setVerbQuestionType(val); resetCard() }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  verbQuestionType === val ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Direction (vocabulary only) + stats */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        {mode === 'vocabulary' ? (
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
            {[['de_to_en', 'DE → EN'], ['en_to_de', 'EN → DE']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setDirection(val); resetCard() }}
                className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                  direction === val ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        {total > 0 && (
          <div className="text-sm text-gray-500">
            <span className="text-green-400 font-medium">{stats.correct}</span>
            <span className="mx-1">/</span>
            <span className="text-red-400 font-medium">{stats.wrong}</span>
            <span className="ml-1.5 text-gray-600">({total})</span>
          </div>
        )}
      </div>

      {/* Start / card */}
      {!card && !error && (
        <button
          onClick={loadNext}
          disabled={loading}
          className="w-full py-8 md:py-12 rounded-xl border-2 border-dashed border-gray-800 text-gray-500 hover:border-amber-500/40 hover:text-amber-400 transition-colors flex flex-col items-center gap-2 touch-manipulation min-h-[100px] md:min-h-[120px]"
        >
          <Layers size={32} />
          <span className="text-sm font-medium">Start Practice</span>
        </button>
      )}

      {error && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
          <p className="text-gray-400 text-sm mb-3">{error}</p>
          <button onClick={loadNext} className="text-amber-400 text-sm font-medium hover:underline">
            Try again
          </button>
        </div>
      )}

      {card && !result && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="px-4 py-5 md:px-6 md:py-8 text-center">
            {card.type === 'strong_verb' ? (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 md:mb-3">
                  {verbQuestionType === 'partizip' ? 'Partizip II (Perfekt)' : 'Präteritum'}
                </p>
                <p className="text-xl md:text-2xl font-bold text-amber-300">{card.infinitive}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 md:mb-3">
                  {direction === 'de_to_en' ? 'Translate to English' : 'Translate to German'}
                </p>
                <p className="text-xl md:text-2xl font-bold text-amber-300">
                  {(card.prompt && card.prompt.includes(': '))
                    ? card.prompt.split(': ')[1]
                    : direction === 'de_to_en'
                      ? card.word
                      : card.translation}
                </p>
              </>
            )}
          </div>
          <form onSubmit={handleSubmit} className="px-4 pb-4 md:px-6 md:pb-6 flex gap-2">
            <input
              autoFocus
              className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder={
                card.type === 'strong_verb' && verbQuestionType === 'partizip'
                  ? 'e.g. ist gegangen'
                  : 'Your answer...'
              }
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-gray-950 px-5 py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px] shrink-0"
            >
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div
            className={`px-4 py-4 md:px-6 md:py-6 text-center ${
              result.is_correct ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {result.is_correct ? (
                <Check size={20} className="text-green-400" />
              ) : (
                <X size={20} className="text-red-400" />
              )}
              <span
                className={`font-semibold text-sm md:text-base ${
                  result.is_correct ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {result.is_correct ? 'Correct!' : 'Wrong'}
              </span>
            </div>
            <p className="text-base md:text-lg font-bold text-amber-300">{result.word}</p>
          </div>
          <div className="px-4 py-3 md:px-6 md:py-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Correct answer</span>
              <span className="text-gray-200 font-medium">{result.correct_answer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Your answer</span>
              <span className={result.is_correct ? 'text-green-400' : 'text-red-400'}>
                {result.your_answer}
              </span>
            </div>
          </div>
          <div className="px-4 pb-4 md:px-6 md:pb-5">
            <button
              onClick={loadNext}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold py-3 rounded-lg transition-colors text-sm touch-manipulation min-h-[48px]"
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22.4 10.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9" />
      <path d="m22.4 14.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9" />
    </svg>
  )
}
