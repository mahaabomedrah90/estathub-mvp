/**
 * Saudi KYC and Auth Validation Utilities
 * PDPL-compliant: No sensitive data logging
 */

// ============================================================================
// Email Validation (RFC-like)
// ============================================================================

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'email_required' }
  }

  const normalized = email.toLowerCase().trim()

  // RFC 5322 compliant regex (simplified for practical use)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!emailRegex.test(normalized)) {
    return { valid: false, error: 'email_invalid_format' }
  }

  if (normalized.length > 254) {
    return { valid: false, error: 'email_too_long' }
  }

  return { valid: true }
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

// ============================================================================
// Phone Validation (E.164 for Saudi Arabia)
// ============================================================================

export function validatePhone(phone: string): { valid: boolean; error?: string; normalized?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'phone_required' }
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Saudi phone numbers: +966 5X XXX XXXX
  // Local formats: 05X XXX XXXX, 5X XXX XXXX, 9665X XXX XXXX

  let normalized: string

  if (digits.length === 12 && digits.startsWith('966')) {
    // Format: 9665XXXXXXXX
    normalized = `+${digits}`
  } else if (digits.length === 9 && digits.startsWith('5')) {
    // Format: 5XXXXXXXX
    normalized = `+966${digits}`
  } else if (digits.length === 10 && digits.startsWith('05')) {
    // Format: 05XXXXXXXX
    normalized = `+966${digits.slice(1)}`
  } else {
    return { valid: false, error: 'phone_invalid_format' }
  }

  // Validate it's a valid Saudi mobile number
  const saudiMobileRegex = /^\+9665[0-9]{8}$/
  if (!saudiMobileRegex.test(normalized)) {
    return { valid: false, error: 'phone_invalid_saudi_format' }
  }

  return { valid: true, normalized }
}

export function normalizePhone(phone: string): string | null {
  const result = validatePhone(phone)
  return result.valid ? result.normalized! : null
}

// ============================================================================
// Saudi National ID (NIN / Iqama) Validation
// Using Luhn algorithm checksum for 10-digit Saudi IDs
// ============================================================================

export function validateNationalId(nationalId: string): { valid: boolean; error?: string } {
  if (!nationalId || typeof nationalId !== 'string') {
    return { valid: false, error: 'national_id_required' }
  }

  // Remove any whitespace
  const cleaned = nationalId.trim()

  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return { valid: false, error: 'national_id_must_be_10_digits' }
  }

  // First digit must be 1 (Saudi citizens) or 2 (residents/Iqama)
  const firstDigit = parseInt(cleaned[0], 10)
  if (firstDigit !== 1 && firstDigit !== 2) {
    return { valid: false, error: 'national_id_must_start_with_1_or_2' }
  }

  // Luhn algorithm checksum validation (Saudi NIN uses this)
  if (!validateLuhnChecksum(cleaned)) {
    return { valid: false, error: 'national_id_invalid_checksum' }
  }

  return { valid: true }
}

/**
 * Luhn algorithm checksum validation (mod 11)
 * Used by Saudi National ID numbers
 */
function validateLuhnChecksum(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(digits[i], 10)
    // Odd positions (0-indexed even): multiply by 2
    if (i % 2 === 0) {
      const doubled = digit * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    } else {
      sum += digit
    }
  }
  const checksum = (10 - (sum % 10)) % 10
  return checksum === parseInt(digits[9], 10)
}

export function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length !== 10) {
    return '***'
  }
  // Show only last 2 digits: ********12
  return '*'.repeat(8) + nationalId.slice(8)
}

// ============================================================================
// Password Validation (Strong Policy)
// ============================================================================

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'fair' | 'strong'
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['password_required'], strength: 'weak' }
  }

  // Minimum 10 characters
  if (password.length < 10) {
    errors.push('password_min_length')
  } else {
    score += 2
  }

  // Maximum 128 characters (prevent DoS)
  if (password.length > 128) {
    errors.push('password_max_length')
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('password_uppercase_required')
  } else {
    score += 1
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('password_lowercase_required')
  } else {
    score += 1
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    errors.push('password_number_required')
  } else {
    score += 1
  }

  // Optional: At least one special character (encourage but don't require)
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1
  }

  let strength: 'weak' | 'fair' | 'strong' = 'weak'
  if (score >= 5) strength = 'strong'
  else if (score >= 3) strength = 'fair'

  return {
    valid: errors.length === 0,
    errors,
    strength
  }
}

// ============================================================================
// Full Name Validation
// ============================================================================

export function validateFullName(fullName: string): { valid: boolean; error?: string; normalized?: string } {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, error: 'full_name_required' }
  }

  const normalized = fullName.trim().replace(/\s+/g, ' ')

  if (normalized.length < 2) {
    return { valid: false, error: 'full_name_too_short' }
  }

  if (normalized.length > 100) {
    return { valid: false, error: 'full_name_too_long' }
  }

  // Must contain at least 2 words (first and last name)
  const words = normalized.split(' ').filter(w => w.length > 0)
  if (words.length < 2) {
    return { valid: false, error: 'full_name_first_last_required' }
  }

  // Only allow letters, spaces, and common name characters
  const nameRegex = /^[\p{L}\s'-]+$/u
  if (!nameRegex.test(normalized)) {
    return { valid: false, error: 'full_name_invalid_characters' }
  }

  return { valid: true, normalized }
}

// ============================================================================
// Terms Acceptance Validation
// ============================================================================

export function validateTermsAccepted(accepted: boolean): { valid: boolean; error?: string } {
  if (!accepted) {
    return { valid: false, error: 'terms_acceptance_required' }
  }
  return { valid: true }
}

// ============================================================================
// Sanitization Helpers (Prevent logging sensitive data)
// ============================================================================

export function sanitizeForLog(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data }
  const sensitiveFields = [
    'password', 'passwordHash', 'nationalId', 'phoneNumber',
    'otp', 'token', 'creditCard', 'iban', 'verificationCode'
  ]

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

// ============================================================================
// Error Code Mapping (for i18n)
// ============================================================================

export const validationErrorMessages: Record<string, { en: string; ar: string }> = {
  email_required: {
    en: 'Email address is required',
    ar: 'البريد الإلكتروني مطلوب'
  },
  email_invalid_format: {
    en: 'Please enter a valid email address',
    ar: 'يرجى إدخال بريد إلكتروني صحيح'
  },
  email_too_long: {
    en: 'Email address is too long',
    ar: 'البريد الإلكتروني طويل جداً'
  },
  phone_required: {
    en: 'Phone number is required',
    ar: 'رقم الجوال مطلوب'
  },
  phone_invalid_format: {
    en: 'Please enter a valid phone number',
    ar: 'يرجى إدخال رقم جوال صحيح'
  },
  phone_invalid_saudi_format: {
    en: 'Please enter a valid Saudi mobile number (e.g., 05XXXXXXXX)',
    ar: 'يرجى إدخال رقم جوال سعودي صحيح (مثال: 05XXXXXXXX)'
  },
  national_id_required: {
    en: 'National ID is required',
    ar: 'رقم الهوية الوطنية مطلوب'
  },
  national_id_must_be_10_digits: {
    en: 'National ID must be exactly 10 digits',
    ar: 'يجب أن يكون رقم الهوية 10 أرقام'
  },
  national_id_must_start_with_1_or_2: {
    en: 'National ID must start with 1 (citizen) or 2 (resident)',
    ar: 'يجب أن يبدأ رقم الهوية بالرقم 1 (مواطن) أو 2 (مقيم)'
  },
  national_id_invalid_checksum: {
    en: 'National ID appears to be invalid (checksum failed)',
    ar: 'رقم الهوية غير صحيح (فشل التحقق)'
  },
  national_id_already_exists: {
    en: 'This National ID is already registered',
    ar: 'هذا الرقم مسجل مسبقاً'
  },
  phone_already_exists: {
    en: 'This phone number is already registered',
    ar: 'هذا الرقم مسجل مسبقاً'
  },
  email_already_exists: {
    en: 'This email is already registered',
    ar: 'هذا البريد الإلكتروني مسجل مسبقاً'
  },
  password_required: {
    en: 'Password is required',
    ar: 'كلمة المرور مطلوبة'
  },
  password_min_length: {
    en: 'Password must be at least 10 characters',
    ar: 'يجب أن تكون كلمة المرور 10 أحرف على الأقل'
  },
  password_max_length: {
    en: 'Password must not exceed 128 characters',
    ar: 'يجب ألا تتجاوز كلمة المرور 128 حرفاً'
  },
  password_uppercase_required: {
    en: 'Password must contain at least one uppercase letter',
    ar: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل'
  },
  password_lowercase_required: {
    en: 'Password must contain at least one lowercase letter',
    ar: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل'
  },
  password_number_required: {
    en: 'Password must contain at least one number',
    ar: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل'
  },
  full_name_required: {
    en: 'Full name is required',
    ar: 'الاسم الكامل مطلوب'
  },
  full_name_too_short: {
    en: 'Full name is too short',
    ar: 'الاسم الكامل قصير جداً'
  },
  full_name_too_long: {
    en: 'Full name is too long',
    ar: 'الاسم الكامل طويل جداً'
  },
  full_name_first_last_required: {
    en: 'Please provide both first and last name',
    ar: 'يرجى إدخال الاسم الأول واسم العائلة'
  },
  full_name_invalid_characters: {
    en: 'Full name contains invalid characters',
    ar: 'الاسم الكامل يحتوي على أحرف غير صالحة'
  },
  terms_acceptance_required: {
    en: 'You must accept the Terms and Conditions',
    ar: 'يجب قبول الشروط والأحكام'
  },
  invalid_credentials: {
    en: 'Invalid email/phone or password',
    ar: 'البريد الإلكتروني/الجوال أو كلمة المرور غير صحيحة'
  },
  account_not_verified: {
    en: 'Account not verified. Please check your email.',
    ar: 'الحساب غير موثق. يرجى التحقق من بريدك الإلكتروني.'
  }
}
