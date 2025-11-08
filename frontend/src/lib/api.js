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
  // Use Vite proxy (empty base) or direct URL if VITE_API_BASE is set
  const apiBase = import.meta.env.VITE_API_BASE || ''
  const url = `${apiBase}${path}`
  
  console.log('📡 Fetching:', url, 'with options:', opts)
  
  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
  
  try {
    const res = await fetch(url, {
      ...opts,
      credentials: 'include', // Include cookies for CORS
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    console.log('✅ Response received:', res.status, res.statusText)
    
    let data
    try {
      data = await res.json()
      console.log('📊 Response data:', data)
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e)
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
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      console.error('⏱️ Request timeout after 10 seconds')
      throw new Error('Request timeout - server not responding')
    }
    console.error('❌ Fetch error:', error)
    throw error
  }
}

export function authHeader() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
