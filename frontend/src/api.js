const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

export const auth = {
  me: () => request('/auth/me'),
  register: (data) => request('/auth/register', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const vocab = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/vocabulary/${q ? '?' + q : ''}`);
  },
  exportUrl: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return `/vocabulary/export${q ? '?' + q : ''}`;
  },
  import: async (file, params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      q.set(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
    });
    const qs = q.toString();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/vocabulary/import${qs ? `?${qs}` : ''}`, { method: 'POST', credentials: 'include', body: fd });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || res.statusText);
    }
    return res.json();
  },
  listDecks: () => request('/vocabulary/decks'),
  createDeck: (data) => request('/vocabulary/decks', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  updateDeck: (id, data) => request(`/vocabulary/decks/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  deleteDeck: (id) => request(`/vocabulary/decks/${id}`, { method: 'DELETE' }),
  get: (id) => request(`/vocabulary/item/${id}`),
  create: (data) => request('/vocabulary/', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  update: (id, data) => request(`/vocabulary/item/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  delete: (id) => request(`/vocabulary/item/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids) => request('/vocabulary/bulk-delete', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ ids }) }),
  count: () => request('/vocabulary/count'),
};

export const grammar = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/grammar/${q ? '?' + q : ''}`);
  },
  get: (id) => request(`/grammar/${id}`),
  create: (data) => request('/grammar/', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  update: (id, data) => request(`/grammar/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  delete: (id) => request(`/grammar/${id}`, { method: 'DELETE' }),
};

export const flashcards = {
  next: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/flashcards/next${q ? '?' + q : ''}`);
  },
  answer: (data, direction = 'de_to_en') =>
    request(`/flashcards/answer?direction=${direction}`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  markCorrect: (data, direction = 'de_to_en') =>
    request(`/flashcards/mark-correct?direction=${direction}`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
};

export const chat = {
  send: (data) => request('/chat/', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
};
