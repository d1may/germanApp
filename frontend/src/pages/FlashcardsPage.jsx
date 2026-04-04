import { useEffect, useRef, useState } from 'react'
import { flashcards, vocab } from '../api'
import { ArrowRight, RotateCcw, Check, X, Star, Lightbulb } from 'lucide-react'
import { STRONG_VERBS, partizipDisplay } from '../data/strongVerbs'
import { getImportantVerbs } from '../data/importantVerbs'
import { useAuth } from '../auth'

const CEFR_TAGS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const COMMON_TAGS = ['animals', 'food', 'verbs', 'nouns', 'adjectives']

export default function FlashcardsPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState('vocabulary')
  const [tagFilter, setTagFilter] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [vocabImportantOnly, setVocabImportantOnly] = useState(false)
  const [deckFilter, setDeckFilter] = useState('')
  const [vocabCardMode, setVocabCardMode] = useState('weighted_random') // weighted_random | random_no_repeat
  const [direction, setDirection] = useState('de_to_en')
  const [card, setCard] = useState(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [verbQuestionType, setVerbQuestionType] = useState('partizip')
  const [verbFilter, setVerbFilter] = useState('all') // all | important
  const [decks, setDecks] = useState([])
  const [usedVocabularyIds, setUsedVocabularyIds] = useState(new Set())
  const [showExampleHint, setShowExampleHint] = useState(false)

  const effectiveTag = customTag.trim() || tagFilter

  useEffect(() => {
    let active = true
    vocab.listDecks()
      .then((data) => { if (active) setDecks(data) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    setShowExampleHint(false)
  }, [card])

  function resetCard() {
    setCard(null)
    setResult(null)
    setAnswer('')
  }

  function resetVocabularySession() {
    resetCard()
    setUsedVocabularyIds(new Set())
  }

  async function loadNextVocabulary() {
    setLoading(true)
    setError(null)
    try {
      const params = { direction }
      if (effectiveTag) params.tag = effectiveTag
      if (vocabImportantOnly) params.important_only = 'true'
      if (deckFilter === 'none') params.without_deck = 'true'
      else if (deckFilter) params.deck_id = deckFilter
      if (vocabCardMode === 'random_no_repeat' && usedVocabularyIds.size > 0) {
        params.exclude_ids = [...usedVocabularyIds].join(',')
      }
      const nextCard = await flashcards.next(params)
      setCard(nextCard)
      if (vocabCardMode === 'random_no_repeat') {
        setUsedVocabularyIds((prev) => {
          const n = new Set(prev)
          n.add(nextCard.vocabulary_id)
          return n
        })
      }
    } catch (e) {
      if (vocabCardMode === 'random_no_repeat' && e.message === 'No vocabulary words found') {
        setError('No more new words in this selection. Reset filters or switch mode to continue.')
      } else {
        setError(e.message)
      }
      setCard(null)
    } finally {
      setLoading(false)
    }
  }

  function loadNextStrongVerb() {
    const important = getImportantVerbs(user?.id)
    const pool = verbFilter === 'important' && important.size > 0
      ? STRONG_VERBS.filter((v) => important.has(v.infinitive))
      : STRONG_VERBS
    if (pool.length === 0) {
      setCard(null)
      setError(verbFilter === 'important' ? 'No important verbs. Mark some on the Strong Verbs page.' : 'No verbs.')
      return
    }
    const v = pool[Math.floor(Math.random() * pool.length)]
    const expected = verbQuestionType === 'partizip' ? partizipDisplay(v) : v.praeteritum
    setCard({ ...v, expected, type: 'strong_verb' })
  }

  function loadNext() {
    setResult(null)
    setAnswer('')
    setError(null)
    if (mode === 'strong_verbs') loadNextStrongVerb()
    else loadNextVocabulary()
  }

  const loadNextRef = useRef(loadNext)
  loadNextRef.current = loadNext

  useEffect(() => {
    if (!result || loading) return
    function onKeyDown(e) {
      if (e.key !== 'Enter' || e.repeat) return
      if (e.target instanceof HTMLButtonElement) return
      e.preventDefault()
      loadNextRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [result, loading])

  async function submitVocabularyAnswer(e) {
    e.preventDefault()
    if (!card || !answer.trim() || card.type === 'strong_verb') return
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

  async function handleSetAsCorrect() {
    if (!result || result.is_correct || card?.type === 'strong_verb') return
    setLoading(true)
    try {
      const res = await flashcards.markCorrect(
        { vocabulary_id: card.vocabulary_id, answer: result.your_answer },
        direction
      )
      setResult(res)
      setStats((s) => ({ correct: s.correct + 1, wrong: Math.max(0, s.wrong - 1) }))
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
        {[['vocabulary', 'Vocabulary'], ['strong_verbs', 'Strong Verbs']].map(([val, label]) => (
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
        <div className="mb-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-2">Vocabulary set</p>
            <div className="flex gap-1">
              {[['all', 'All'], ['important', 'Important only']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setVocabImportantOnly(val === 'important'); resetVocabularySession() }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    (val === 'important' && vocabImportantOnly) || (val === 'all' && !vocabImportantOnly)
                      ? 'bg-amber-500 text-gray-950'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {val === 'important' && <Star size={12} fill={vocabImportantOnly ? 'currentColor' : 'none'} />}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Card mode</p>
            <div className="flex gap-1">
              {[
                ['weighted_random', 'Random'],
                ['random_no_repeat', 'No repeats'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setVocabCardMode(val); resetVocabularySession() }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    vocabCardMode === val ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Deck</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setDeckFilter(''); resetVocabularySession() }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !deckFilter ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setDeckFilter('none'); resetVocabularySession() }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  deckFilter === 'none' ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                Without deck
              </button>
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => { setDeckFilter(deckFilter === String(deck.id) ? '' : String(deck.id)); resetVocabularySession() }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    deckFilter === String(deck.id) ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {deck.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Filter by tag</p>
            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setTagFilter(''); setCustomTag(''); resetVocabularySession() }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !effectiveTag ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              All
            </button>
            {CEFR_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => { setTagFilter(t); setCustomTag(''); resetVocabularySession() }}
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
                onClick={() => { setTagFilter(t); setCustomTag(''); resetVocabularySession() }}
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
              onChange={(e) => { setCustomTag(e.target.value); setTagFilter(''); resetVocabularySession() }}
              className="w-28 px-2 py-1.5 rounded-md text-xs bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            </div>
          </div>
        </div>
      )}

      {mode === 'strong_verbs' && (
        <div className="mb-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-2">Verb set</p>
            <div className="flex gap-1">
              {[['all', 'All'], ['important', 'Important only']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setVerbFilter(val); resetCard() }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    verbFilter === val ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Ask for</p>
            <div className="flex gap-1">
            {[['partizip', 'Partizip II'], ['praeteritum', 'Präteritum']].map(([val, label]) => (
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
        </div>
      )}

      {/* Direction (vocabulary) + stats */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        {mode === 'vocabulary' ? (
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          {[['de_to_en', 'DE → EN'], ['en_to_de', 'EN → DE']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setDirection(val); resetVocabularySession() }}
              className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                direction === val ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        ) : <div />}
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
          className="w-full py-8 md:py-12 rounded-xl border-2 border-dashed border-gray-800 text-gray-500 hover:border-amber-500/40 hover:text-amber-400 transition-colors flex flex-col items-center gap-2 touch-manipulation min-h-[100px] md:min-h-[120px]"
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
          <div className="relative">
            {card.type !== 'strong_verb' && (
              <div className="absolute right-2 top-2 md:right-3 md:top-3 z-10">
                <button
                  type="button"
                  onClick={() => card.example && setShowExampleHint((v) => !v)}
                  disabled={!card.example}
                  title={
                    card.example
                      ? (showExampleHint ? 'Hide example' : 'Show example sentence (hint)')
                      : 'No example saved — add one in Vocabulary'
                  }
                  className={`p-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    card.example
                      ? showExampleHint
                        ? 'text-amber-400 bg-amber-500/15 ring-1 ring-amber-500/30'
                        : 'text-gray-400 hover:text-amber-400 hover:bg-gray-800'
                      : 'text-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Lightbulb size={22} className={showExampleHint ? 'fill-amber-400/30' : ''} strokeWidth={2} />
                </button>
              </div>
            )}
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
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 md:mb-3">{direction === 'de_to_en' ? 'Translate to English' : 'Translate to German'}</p>
                  <p className="text-xl md:text-2xl font-bold text-amber-300 pr-10 md:pr-0">{(card.prompt && card.prompt.includes(': ')) ? card.prompt.split(': ')[1] : (direction === 'de_to_en' ? card.word : card.translation)}</p>
                  {showExampleHint && card.example && (
                    <p className="mt-4 mx-auto max-w-md text-left sm:text-center text-sm text-gray-300 leading-relaxed border-t border-gray-800 pt-4 px-1">
                      <span className="text-gray-500 not-italic text-xs uppercase tracking-wide block mb-1.5">Example</span>
                      <span className="italic">{card.example}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="px-4 pb-4 md:px-6 md:pb-6 flex gap-2">
            <input
              autoFocus
              className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder={card.type === 'strong_verb' && verbQuestionType === 'partizip' ? 'e.g. ist gegangen' : 'Your answer...'}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-gray-950 px-5 py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px] shrink-0">
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className={`px-4 py-4 md:px-6 md:py-6 text-center ${result.is_correct ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {result.is_correct
                ? <Check size={20} className="text-green-400" />
                : <X size={20} className="text-red-400" />
              }
              <span className={`font-semibold text-sm md:text-base ${result.is_correct ? 'text-green-400' : 'text-red-400'}`}>
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
              <span className={result.is_correct ? 'text-green-400' : 'text-red-400'}>{result.your_answer}</span>
            </div>
          </div>
          <div className="px-4 pb-4 md:px-6 md:pb-5 flex flex-col gap-2">
            {!result.is_correct && mode === 'vocabulary' && (
              <button
                onClick={handleSetAsCorrect}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm touch-manipulation min-h-[44px]"
              >
                <Check size={14} /> Set as correct
              </button>
            )}
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
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22.4 10.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9" />
      <path d="m22.4 14.08-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9" />
    </svg>
  )
}
