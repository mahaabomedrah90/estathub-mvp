export function getToken() {

  return localStorage.getItem('estathub_token') || ''
}

export function setToken(t) {
  if (t) localStorage.setItem('estathub_token', t)
}

export function clearToken() {
  localStorage.removeItem('estathub_token')
}

function normalizeBaseUrl(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.endsWith('/') ? s.slice(0, -1) : s
}

function joinApiUrl(base, path) {
  const b = normalizeBaseUrl(base)
  const p = String(path || '')

  if (!b) return p

  if (b.endsWith('/api') && p.startsWith('/api/')) {
    return `${b}${p.slice(4)}`
  }

  return `${b}${p}`
}

function getApiBase() {
  return (
    normalizeBaseUrl(import.meta.env.VITE_API_BASE) ||
    normalizeBaseUrl(import.meta.env.VITE_API_URL) ||
    ''
  )
}

// ===== ENHANCED API CLIENT =====
export class ApiClient {
  constructor() {
    this.apiBase = getApiBase()
  }
  
  // Generic request method
  async request(path, options = {}) {
    const url = joinApiUrl(this.apiBase, path)
    
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
      
      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      let data = null

      if (isJson) {
        try {
          data = await response.json()
        } catch (e) {
          console.warn('⚠️ Failed to parse JSON response')
          data = null
        }
      }
      
      if (!response.ok) {
        let bodyText = ''
        if (!isJson) {
          try {
            bodyText = await response.text()
          } catch {
            bodyText = ''
          }
        }

        const error = new ApiError(
          data?.error ||
            data?.details ||
            (bodyText ? `Non-JSON response: ${bodyText.slice(0, 120)}` : response.statusText) ||
            'Request failed',
          response.status,
          data?.code || 'request_failed',
          data?.details
        )
        error.response = response
        error.data = data
        throw error
      }

      if (!isJson) {
        let bodyText = ''
        try {
          bodyText = await response.text()
        } catch {
          bodyText = ''
        }
        throw new ApiError(
          bodyText
            ? `Expected JSON but got non-JSON response: ${bodyText.slice(0, 120)}`
            : 'Expected JSON but got empty non-JSON response',
          response.status,
          'non_json_response'
        )
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
// Add this function if it doesn't exist, or update it if it does
export async function fetchJson(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const base = getApiBase()
  const finalUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : joinApiUrl(base, url)

  try {
    const response = await fetch(finalUrl, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (!response.ok) {
      let bodyText = ''
      try {
        bodyText = await response.text()
      } catch {
        bodyText = ''
      }
      const error = new Error(
        bodyText
          ? `HTTP ${response.status}. Non-JSON body: ${bodyText.slice(0, 120)}`
          : `HTTP error! status: ${response.status}`
      )
      error.status = response.status
      throw error
    }

    if (!isJson) {
      let bodyText = ''
      try {
        bodyText = await response.text()
      } catch {
        bodyText = ''
      }
      const error = new Error(
        bodyText
          ? `Expected JSON but got non-JSON response: ${bodyText.slice(0, 120)}`
          : 'Expected JSON but got empty non-JSON response'
      )
      error.status = response.status
      throw error
    }

    return await response.json()
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
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
  ],

  // Regulator permissions (read-only access + regulatory tools)
  regulator: [
    '/regulator/overview',
    '/regulator/properties',
    '/regulator/properties/:id',
    '/regulator/ledger',
    '/regulator/aml-alerts',
    '/blockchain'
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

// ============================================================================
// PROPERTY SUBMISSION CONSTANTS & HELPERS
// ============================================================================

export const OwnershipType = {
  SINGLE_OWNER: 'SINGLE_OWNER',
  SHARED: 'SHARED',
  CORPORATE: 'CORPORATE',
  USUFRUCT: 'USUFRUCT',
  ELECTRONIC_DEED: 'ELECTRONIC_DEED',
  PAPER_DEED: 'PAPER_DEED'
}

export const PropertyType = {
  RESIDENTIAL_VILLA: 'residentialVilla',
  RESIDENTIAL_APARTMENT: 'residentialApartment',
  RESIDENTIAL_COMPOUND: 'residentialCompound',
  COMMERCIAL_OFFICE: 'commercialOffice',
  COMMERCIAL_RETAIL: 'commercialRetail',
  COMMERCIAL_WAREHOUSE: 'commercialWarehouse',
  MIXED_USE: 'mixedUse',
  LAND_RESIDENTIAL: 'landResidential',
  LAND_COMMERCIAL: 'landCommercial',
  AGRICULTURAL: 'agricultural',
  INDUSTRIAL: 'industrial'
}

export const PropertyCondition = {
  NEW: 'NEW',
  USED: 'USED',
  RENOVATED: 'RENOVATED',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION'
}

export const PayoutSchedule = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  ANNUAL: 'ANNUAL'
}

export const OwnerType = {
  INDIVIDUAL: 'INDIVIDUAL',
  COMPANY: 'COMPANY'
}

export const PropertyTypeLabels = {
  [PropertyType.RESIDENTIAL_VILLA]: 'Residential Villa / فيلا سكنية',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Residential Apartment / شقة سكنية',
  [PropertyType.RESIDENTIAL_COMPOUND]: 'Residential Compound / مجمع سكني',
  [PropertyType.COMMERCIAL_OFFICE]: 'Commercial Office / مكتب تجاري',
  [PropertyType.COMMERCIAL_RETAIL]: 'Commercial Retail / محل تجاري',
  [PropertyType.COMMERCIAL_WAREHOUSE]: 'Commercial Warehouse / مستودع',
  [PropertyType.MIXED_USE]: 'Mixed Use / استخدام مختلط',
  [PropertyType.LAND_RESIDENTIAL]: 'Residential Land / أرض سكنية',
  [PropertyType.LAND_COMMERCIAL]: 'Commercial Land / أرض تجارية',
  [PropertyType.AGRICULTURAL]: 'Agricultural / زراعي',
  [PropertyType.INDUSTRIAL]: 'Industrial / صناعي'
}

export const PropertyConditionLabels = {
  [PropertyCondition.NEW]: 'New / جديد',
  [PropertyCondition.USED]: 'Used / مستعمل',
  [PropertyCondition.RENOVATED]: 'Renovated / مجدد',
  [PropertyCondition.UNDER_CONSTRUCTION]: 'Under Construction / تحت الإنشاء'
}

export const OwnershipTypeLabels = {
  [OwnershipType.SINGLE_OWNER]: 'Single Owner / مالك واحد',
  [OwnershipType.SHARED]: 'Shared / ملكية مشتركة',
  [OwnershipType.CORPORATE]: 'Corporate / شركة',
  [OwnershipType.USUFRUCT]: 'Usufruct / حق الانتفاع',
  [OwnershipType.ELECTRONIC_DEED]: 'Electronic Deed / صك إلكتروني',
  [OwnershipType.PAPER_DEED]: 'Paper Deed / صك ورقي'
}

export const PayoutScheduleLabels = {
  [PayoutSchedule.MONTHLY]: 'Monthly / شهري',
  [PayoutSchedule.QUARTERLY]: 'Quarterly / ربع سنوي',
  [PayoutSchedule.ANNUAL]: 'Annual / سنوي'
}

export const OwnerTypeLabels = {
  [OwnerType.INDIVIDUAL]: 'Individual / فرد',
  [OwnerType.COMPANY]: 'Company / شركة'
}

// Helper functions
export function calculateAvailableTokens(totalTokens, ownerRetainedPercentage) {
  const total = Number(totalTokens) || 0
  const retained = Number(ownerRetainedPercentage) || 0
  const retainedTokens = Math.floor((total * retained) / 100)
  return total - retainedTokens
}

export function validateNationalId(id) {
  return /^[12][0-9]{9}$/.test(id)
}

export function validatePhone(phone) {
  return /^(\+966|0)?5[0-9]{8}$/.test(phone)
}

export function validateIban(iban) {
  return /^SA[0-9]{22}$/.test(iban)
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// ============================================================================
// REGULATOR API HELPERS
// ==========================================================================

export async function getRegulatorProperties(params = {}) {
  const query = new URLSearchParams(params).toString()
  const suffix = query ? `?${query}` : ''
  return fetchJson(`/api/regulator/properties${suffix}`, {
    headers: { ...authHeader() },
  })
}

export async function getRegulatorProperty(id) {
  return fetchJson(`/api/regulator/properties/${id}`, {
    headers: { ...authHeader() },
  })
}

export async function approvePropertyAsRegulator(id) {
  return fetchJson(`/api/regulator/properties/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({}),
  })
}

export async function rejectPropertyAsRegulator(id, reason = '') {
  return fetchJson(`/api/regulator/properties/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ reason }),
  })
}

export async function getRegulatorLedger(params = {}) {
  const query = new URLSearchParams(params).toString()
  const suffix = query ? `?${query}` : ''
  return fetchJson(`/api/regulator/ledger${suffix}`, {
    headers: { ...authHeader() },
  })
}

export async function getRegulatorAMLAlerts() {
  return fetchJson('/api/regulator/aml-alerts', {
    headers: { ...authHeader() },
  })
}
