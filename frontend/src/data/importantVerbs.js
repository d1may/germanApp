const STORAGE_KEY = 'germanApp_important_verbs'

export function getImportantVerbs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function setImportantVerbs(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export function toggleImportant(infinitive) {
  const set = getImportantVerbs()
  if (set.has(infinitive)) {
    set.delete(infinitive)
  } else {
    set.add(infinitive)
  }
  setImportantVerbs(set)
  return set
}
