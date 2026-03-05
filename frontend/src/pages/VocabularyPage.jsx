import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Download, Upload, Star } from 'lucide-react'
import { vocab } from '../api'
import Modal from '../components/Modal'
import TagBadge from '../components/TagBadge'

const EMPTY = { word: '', translation: '', example: '', tags: '' }
const CEFR_TAGS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function VocabularyPage() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [importantOnly, setImportantOnly] = useState(false)
  const [sortOrder, setSortOrder] = useState('newest')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState(null)
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { sort: sortOrder }
      if (search.trim()) params.search = search.trim()
      if (tagFilter) params.tag = tagFilter
      if (importantOnly) params.important_only = 'true'
      setItems(await vocab.list(params))
    } finally {
      setLoading(false)
    }
  }, [search, tagFilter, sortOrder, importantOnly])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ word: item.word, translation: item.translation, example: item.example || '', tags: item.tags || '' })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = { ...form, example: form.example || null, tags: form.tags || null }
    if (editing) {
      await vocab.update(editing.id, data)
    } else {
      await vocab.create(data)
    }
    setModalOpen(false)
    load()
  }

  async function handleDelete(id) {
    await vocab.delete(id)
    load()
  }

  async function toggleImportant(item) {
    await vocab.update(item.id, { important: !item.important })
    load()
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMessage(null)
    try {
      const res = await vocab.import(file)
      const msg = res.errors?.length
        ? `Imported ${res.created} words. ${res.errors.length} row(s) skipped.`
        : `Imported ${res.created} words.`
      setImportMessage(msg)
      load()
    } catch (err) {
      setImportMessage(`Error: ${err.message}`)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const field = (label, name, opts = {}) => (
    <label className="block">
      <span className="text-sm text-gray-400 mb-1 block">{label}</span>
      {opts.textarea ? (
        <textarea
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          rows={2}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={opts.placeholder}
        />
      ) : (
        <input
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={opts.placeholder}
          required={opts.required}
        />
      )}
    </label>
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-xl font-bold">Vocabulary</h1>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
            disabled={importing}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors border border-gray-700 min-h-[44px] touch-manipulation"
          >
            <Upload size={16} /> <span className="hidden sm:inline">Import CSV</span>
          </button>
          <a
            href={vocab.exportUrl({ sort: sortOrder, ...(tagFilter && { tag: tagFilter }), ...(search.trim() && { search: search.trim() }) })}
            download="vocabulary.csv"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors border border-gray-700 min-h-[44px] touch-manipulation"
          >
            <Download size={16} /> <span className="hidden sm:inline">Export CSV</span>
          </a>
          <button onClick={openCreate} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors min-h-[44px] touch-manipulation">
            <Plus size={16} /> Add Word
          </button>
        </div>
      </div>

      {importMessage && (
        <p className="mb-4 text-sm text-gray-400">{importMessage}</p>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          placeholder="Search words or translations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setImportantOnly(!importantOnly); setTagFilter('') }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              importantOnly ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Star size={12} fill={importantOnly ? 'currentColor' : 'none'} /> Important
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <span className="text-xs text-gray-500 shrink-0">Level:</span>
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            <button
              onClick={() => setTagFilter('')}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-colors shrink-0 touch-manipulation ${
                !tagFilter ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              All
            </button>
            {CEFR_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors shrink-0 touch-manipulation ${
                  tagFilter === t ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Date:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="rounded-lg bg-gray-900 border border-gray-800 px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No vocabulary words yet. Add your first one!</p>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="md:hidden flex flex-col gap-3">
            {items.map((v) => (
              <div key={v.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-amber-300 truncate">{v.word}</p>
                    <p className="text-gray-300 text-sm mt-0.5">{v.translation}</p>
                    {v.example && <p className="text-gray-500 text-xs mt-1 truncate">{v.example}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {v.tags?.split(',').filter(Boolean).map((t) => <TagBadge key={t} tag={t.trim()} />)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="text-green-400">{v.correct_count}</span>/<span className="text-red-400">{v.wrong_count}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleImportant(v)} className={`p-2.5 rounded-lg transition-colors touch-manipulation ${v.important ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400 hover:bg-gray-800'}`} title={v.important ? 'Remove from important' : 'Mark as important'}>
                      <Star size={18} fill={v.important ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => openEdit(v)} className="p-2.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-gray-800 transition-colors touch-manipulation">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="p-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors touch-manipulation">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Word</th>
                  <th className="px-4 py-3 font-medium">Translation</th>
                  <th className="px-4 py-3 font-medium">Example</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium text-center">Score</th>
                  <th className="px-4 py-3 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id} className="border-t border-gray-800/60 hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-amber-300">{v.word}</td>
                    <td className="px-4 py-3 text-gray-300">{v.translation}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{v.example}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {v.tags?.split(',').filter(Boolean).map((t) => <TagBadge key={t} tag={t.trim()} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-400">{v.correct_count}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-red-400">{v.wrong_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleImportant(v)} className={`p-1.5 rounded-md transition-colors ${v.important ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400 hover:bg-gray-800'}`} title={v.important ? 'Remove from important' : 'Mark as important'}>
                          <Star size={14} fill={v.important ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => openEdit(v)} className="p-1.5 rounded-md text-gray-500 hover:text-amber-400 hover:bg-gray-800 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Word' : 'Add Word'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {field('German Word', 'word', { required: true, placeholder: 'der Hund' })}
          {field('Translation', 'translation', { required: true, placeholder: 'the dog' })}
          {field('Example Sentence', 'example', { textarea: true, placeholder: 'Der Hund ist groß.' })}
          {field('Tags (comma-separated)', 'tags', { placeholder: 'animals, A1' })}
          <button type="submit" className="mt-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold py-2 rounded-lg transition-colors text-sm">
            {editing ? 'Save Changes' : 'Add Word'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
