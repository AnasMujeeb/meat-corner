const BASE = '/api/public';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  settings:   () => get('/settings'),
  categories: () => get('/categories'),
  menu:       (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return get(`/menu${qs ? `?${qs}` : ''}`);
  },
  menuItem:   (slug) => get(`/menu/${slug}`),
  branches:   () => get('/branches'),
  contact:    (body) => fetch(`${BASE}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  catering:   (body) => fetch(`${BASE}/catering`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
};
