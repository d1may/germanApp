import { useState } from 'react'
import { Search, Star } from 'lucide-react'
import { STRONG_VERBS, partizipDisplay } from '../data/strongVerbs'
import { getImportantVerbs, toggleImportant } from '../data/importantVerbs'

export default function StrongVerbsPage() {
  const [search, setSearch] = useState('')
  const [importantOnly, setImportantOnly] = useState(false)
  const [important, setImportant] = useState(getImportantVerbs)

  function handleToggle(infinitive) {
    setImportant(toggleImportant(infinitive))
  }

  const filtered = STRONG_VERBS.filter((v) => {
    if (importantOnly && !important.has(v.infinitive)) return false
    if (!search.trim()) return true
    return (
      v.infinitive.toLowerCase().includes(search.toLowerCase()) ||
      v.praeteritum.toLowerCase().includes(search.toLowerCase()) ||
      v.partizip.toLowerCase().includes(search.toLowerCase()) ||
      partizipDisplay(v).toLowerCase().includes(search.toLowerCase()) ||
      v.translation.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4 md:mb-6">Strong Verbs (Starke Verben)</h1>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          placeholder="Search verbs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setImportantOnly(!importantOnly)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            importantOnly ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Star size={12} fill={importantOnly ? 'currentColor' : 'none'} /> Important
        </button>
      </div>

      {/* Mobile: card layout */}
      <div className="md:hidden flex flex-col gap-2">
        {filtered.map((v, i) => (
          <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-amber-300">{v.infinitive}</p>
              <p className="text-gray-400 text-sm mt-1">{v.praeteritum} · {partizipDisplay(v)}</p>
              <p className="text-gray-500 text-xs mt-1">{v.translation}</p>
            </div>
            <button
              onClick={() => handleToggle(v.infinitive)}
              className={`p-2 rounded-lg shrink-0 transition-colors touch-manipulation ${
                important.has(v.infinitive)
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-gray-600 hover:text-amber-500/70'
              }`}
              title={important.has(v.infinitive) ? 'Remove from important' : 'Mark as important'}
            >
              <Star size={20} fill={important.has(v.infinitive) ? 'currentColor' : 'none'} />
            </button>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium w-12"></th>
              <th className="px-4 py-3 font-medium">Infinitiv</th>
              <th className="px-4 py-3 font-medium">Präteritum</th>
              <th className="px-4 py-3 font-medium">Partizip II</th>
              <th className="px-4 py-3 font-medium">Translation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => (
              <tr key={i} className="border-t border-gray-800/60 hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(v.infinitive)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      important.has(v.infinitive)
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-gray-600 hover:text-amber-500/70'
                    }`}
                    title={important.has(v.infinitive) ? 'Remove from important' : 'Mark as important'}
                  >
                    <Star size={16} fill={important.has(v.infinitive) ? 'currentColor' : 'none'} />
                  </button>
                </td>
                <td className="px-4 py-3 font-medium text-amber-300">{v.infinitive}</td>
                <td className="px-4 py-3 text-gray-300">{v.praeteritum}</td>
                <td className="px-4 py-3 text-gray-300">{partizipDisplay(v)}</td>
                <td className="px-4 py-3 text-gray-500">{v.translation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
