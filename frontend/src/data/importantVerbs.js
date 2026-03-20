const BASE_KEY = 'germanApp_important_verbs'

function keyForUser(userId) {
  if (userId == null) return `${BASE_KEY}_anon`
  return `${BASE_KEY}_u${userId}`
}

export function getImportantVerbs(userId) {
  try {
    const k = keyForUser(userId)
    const raw = localStorage.getItem(k) ?? localStorage.getItem(BASE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function setImportantVerbs(userId, set) {
  localStorage.setItem(keyForUser(userId), JSON.stringify([...set]))
}

export function toggleImportant(userId, infinitive) {
  const set = getImportantVerbs(userId)
  if (set.has(infinitive)) {
    set.delete(infinitive)
  } else {
    set.add(infinitive)
  }
  setImportantVerbs(userId, set)
  return set
}
