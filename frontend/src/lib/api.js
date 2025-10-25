export function getToken() {
  return localStorage.getItem('estathub_token') || ''
}

export function setToken(t) {
  if (t) localStorage.setItem('estathub_token', t)
}

export function clearToken() {
  localStorage.removeItem('estathub_token')
}

export async function fetchJson(path, opts = {}) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}${path}`, opts)
  let data
  try {
    data = await res.json()
  } catch {
    data = undefined
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || 'request_failed'
    const err = new Error(String(msg))
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

export function authHeader() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
