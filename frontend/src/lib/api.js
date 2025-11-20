export function getToken() {
  return localStorage.getItem('estathub_token') || ''
}

export function setToken(t) {
  if (t) localStorage.setItem('estathub_token', t)
}

export function clearToken() {
  localStorage.removeItem('estathub_token')
}

// ===== ENHANCED API CLIENT =====
export class ApiClient {
  constructor() {
    this.apiBase = import.meta.env.VITE_API_BASE || ''
  }
  
  // Generic request method
  async request(path, options = {}) {
    const url = `${this.apiBase}${path}`
    
    console.log('📡 API Request:', {
      method: options.method || 'GET',
      url,
      hasBody: !!options.body,
      hasAuth: !!options.headers?.Authorization
    })
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log('✅ API Response:', {
        status: response.status,
        statusText: response.statusText,
        url
      })
      
      // Try to parse JSON response
      let data
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (e) {
          console.warn('⚠️ Failed to parse JSON response')
          data = null
        }
      }
      
      if (!response.ok) {
        const error = new ApiError(
          data?.error || data?.details || response.statusText || 'Request failed',
          response.status,
          data?.code || 'request_failed',
          data?.details
        )
        error.response = response
        error.data = data
        throw error
      }
      
      return data
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout - server not responding', 408, 'timeout')
      }
      
      if (error instanceof ApiError) {
        throw error
      }
      
      console.error('❌ Network error:', error)
      throw new ApiError('Network error - please check your connection', 0, 'network_error')
    }
  }
  
  // JSON requests
  async get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' })
  }
  
  async post(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    })
  }
  
  async put(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    })
  }
  
  async patch(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    })
  }
  
  async delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' })
  }
  
  // FormData requests (for file uploads)
  async upload(path, formData, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      // Don't set Content-Type for FormData - browser sets it with boundary
      body: formData
    })
  }
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(message, status = 500, code = 'api_error', details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// Create singleton instance
export const api = new ApiClient()

// Backward compatibility - keep fetchJson for existing code
export async function fetchJson(path, opts = {}) {
  try {
    return await api.request(path, opts)
  } catch (error) {
    // Convert ApiError to old format for backward compatibility
    if (error instanceof ApiError) {
      const legacyError = new Error(error.message)
      legacyError.status = error.status
      legacyError.body = error.data
      throw legacyError
    }
    throw error
  }
}

export function authHeader() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// ===== ROLE-BASED ACCESS CONTROL =====

// Default permissions - can be overridden by admin settings
export const defaultPermissions = {
  // Public pages (no authentication required)
  public: [
    '/',
    '/opportunities',
    '/properties/:id',
    '/verify-deed',
    '/login',
    '/signup'
  ],
  
  // Investor permissions
  investor: [
    '/investor/dashboard',
    '/investor/wallet',
    '/investor/deeds',
    '/investor/opportunities',
    '/investor/properties/:id',
    '/blockchain' // Investors can see blockchain by default
  ],
  
  // Owner permissions
  owner: [
    '/owner/dashboard',
    '/owner/properties',
    '/owner/properties/new',
    '/owner/investors',
    '/blockchain' // Owners can see blockchain by default
  ],
  
  // Admin permissions (has access to everything)
  admin: [
    '/admin/overview',
    '/admin/opportunities',
    '/admin/users',
    '/admin/issue-deeds',
    '/admin/reports',
    '/admin/settings',
    '/admin/investors',
    '/blockchain', // Admin can see blockchain
    // Admin can also access all investor and owner pages if needed
    '/investor/dashboard',
    '/owner/dashboard'
  ]
}

// Navigation permissions - which navigation items to show
export const navigationPermissions = {
  // Pages that should appear in main navigation for each role
  navbar: {
    investor: [
      { path: '/investor/dashboard', label: 'Dashboard' },
      { path: '/investor/opportunities', label: 'Opportunities' },
      { path: '/blockchain', label: 'Blockchain', configurable: true } // Can be toggled
    ],
    owner: [
      { path: '/owner/dashboard', label: 'Dashboard' },
      { path: '/owner/properties', label: 'Properties' },
      { path: '/blockchain', label: 'Blockchain', configurable: true } // Can be toggled
    ],
    admin: [
      { path: '/admin/overview', label: 'Dashboard' },
      { path: '/admin/opportunities', label: 'Review Properties' },
      { path: '/blockchain', label: 'Blockchain', configurable: true } // Can be toggled
    ]
  }
}

// Get current user permissions from localStorage or admin settings
export function getCurrentPermissions() {
  const role = (localStorage.getItem('role') || 'investor').toLowerCase()
  
  // Get admin-configured permissions if they exist
  const configuredPermissions = localStorage.getItem(`permissions_${role}`)
  
  if (configuredPermissions) {
    try {
      return JSON.parse(configuredPermissions)
    } catch (e) {
      console.warn('Invalid permissions configuration, using defaults')
    }
  }
  
  return defaultPermissions[role] || defaultPermissions.investor
}

// Check if a user has permission to access a specific route
export function hasPermission(route, userRole = null) {
  const role = userRole || (localStorage.getItem('role') || 'investor').toLowerCase()
  
  // Check public routes first
  if (defaultPermissions.public.includes(route)) {
    return true
  }
  
  // Get role-specific permissions
  const permissions = getCurrentPermissions()
  
  // Check exact match
  if (permissions.includes(route)) {
    return true
  }
  
  // Check for dynamic routes (e.g., /properties/:id)
  const routeParts = route.split('/')
  for (const permission of permissions) {
    const permissionParts = permission.split('/')
    if (routeParts.length !== permissionParts.length) continue
    
    let matches = true
    for (let i = 0; i < routeParts.length; i++) {
      if (permissionParts[i].startsWith(':')) continue // Skip dynamic params
      if (routeParts[i] !== permissionParts[i]) {
        matches = false
        break
      }
    }
    
    if (matches) return true
  }
  
  return false
}

// Get navigation items for a role
export function getNavigationItems(role = null) {
  const userRole = role || (localStorage.getItem('role') || 'investor').toLowerCase()
  const items = navigationPermissions.navbar[userRole] || navigationPermissions.navbar.investor
  
  // Filter out configurable items that are disabled
  const disabledItems = getDisabledNavigationItems(userRole)
  
  return items.filter(item => {
    if (!item.configurable) return true
    return !disabledItems.includes(item.path)
  })
}

// Get disabled navigation items from admin settings
function getDisabledNavigationItems(role) {
  const disabled = localStorage.getItem(`disabled_nav_${role}`)
  if (disabled) {
    try {
      return JSON.parse(disabled)
    } catch (e) {
      console.warn('Invalid disabled navigation configuration')
    }
  }
  return []
}

// Update permissions (for admin settings)
export function updatePermissions(role, permissions) {
  localStorage.setItem(`permissions_${role}`, JSON.stringify(permissions))
}

// Update navigation visibility (for admin settings)
export function updateNavigationVisibility(role, disabledItems) {
  localStorage.setItem(`disabled_nav_${role}`, JSON.stringify(disabledItems))
}
