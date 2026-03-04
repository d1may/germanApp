const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

export const vocab = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/vocabulary/${q ? '?' + q : ''}`);
  },
  exportUrl: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return `/vocabulary/export${q ? '?' + q : ''}`;
  },
  import: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/vocabulary/import', { method: 'POST', body: fd });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || res.statusText);
    }
    return res.json();
  },
  get: (id) => request(`/vocabulary/${id}`),
  create: (data) => request('/vocabulary/', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  update: (id, data) => request(`/vocabulary/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(data) }),
  delete: (id) => request(`/vocabulary/${id}`, { method: 'DELETE' }),
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
};

export const chat = {
  send: (data) => request('/chat/', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(data) }),
};
