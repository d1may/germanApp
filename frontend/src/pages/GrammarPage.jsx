import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { grammar } from '../api'
import Modal from '../components/Modal'
import TagBadge from '../components/TagBadge'

const EMPTY = { title: '', content: '', tags: '' }

export default function GrammarPage() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      setItems(await grammar.list(params))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ title: item.title, content: item.content, tags: item.tags || '' })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = { ...form, tags: form.tags || null }
    if (editing) {
      await grammar.update(editing.id, data)
    } else {
      await grammar.create(data)
    }
    setModalOpen(false)
    load()
  }

  async function handleDelete(id) {
    await grammar.delete(id)
    load()
  }

  const field = (label, name, opts = {}) => (
    <label className="block">
      <span className="text-sm text-gray-400 mb-1 block">{label}</span>
      {opts.textarea ? (
        <textarea
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          rows={6}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={opts.placeholder}
          required={opts.required}
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold">Grammar Rules</h1>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors min-h-[44px] touch-manipulation w-full sm:w-auto">
          <Plus size={16} /> Add Rule
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          placeholder="Search grammar rules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No grammar rules yet. Add your first one!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((rule) => (
            <div key={rule.id} className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900/40">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-900 transition-colors touch-manipulation min-h-[48px]"
                onClick={() => toggle(rule.id)}
              >
                {expanded.has(rule.id) ? <ChevronDown size={16} className="text-gray-500 shrink-0" /> : <ChevronRight size={16} className="text-gray-500 shrink-0" />}
                <span className="font-medium text-amber-300 flex-1 min-w-0 truncate">{rule.title}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {rule.tags?.split(',').filter(Boolean).slice(0, 3).map((t) => <TagBadge key={t} tag={t.trim()} />)}
                  <button onClick={(e) => { e.stopPropagation(); openEdit(rule) }} className="p-2 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-gray-800 transition-colors touch-manipulation">
                    <Pencil size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(rule.id) }} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors touch-manipulation">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {expanded.has(rule.id) && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-800">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{rule.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rule' : 'Add Rule'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {field('Title', 'title', { required: true, placeholder: 'Akkusativ' })}
          {field('Content', 'content', { textarea: true, required: true, placeholder: 'The accusative case is used for...' })}
          {field('Tags (comma-separated)', 'tags', { placeholder: 'cases, A2' })}
          <button type="submit" className="mt-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold py-2 rounded-lg transition-colors text-sm">
            {editing ? 'Save Changes' : 'Add Rule'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
