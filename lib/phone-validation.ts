/**
 * Phone number and GCash number validation utilities
 * Ensures consistent (+63) prefix and 10-digit number format across the application
 */

// Default prefix for Philippine phone numbers
export const PHONE_PREFIX = "+63"

// Validation regex for 10-digit Philippine mobile numbers (after +63)
const PHONE_REGEX = /^[9][0-9]{9}$/

/**
 * Validates if a phone number is in the correct format
 * @param phoneNumber - The phone number to validate (10-digit number or with +63 prefix)
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false
  
  // Remove any spaces, dashes, or parentheses
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '')
  
  // Check if it starts with +63
  if (cleaned.startsWith('+63')) {
    const numberPart = cleaned.substring(3)
    return PHONE_REGEX.test(numberPart)
  }
  
  // Check if it's just the 10-digit number (without prefix)
  if (cleaned.length === 10) {
    return PHONE_REGEX.test(cleaned)
  }
  
  // Check if it's 11 digits starting with 0 (common format like 09123456789)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const numberPart = cleaned.substring(1) // Remove the leading 0
    return PHONE_REGEX.test(numberPart)
  }
  
  return false
}

/**
 * Normalizes a phone number to the standard +63XXXXXXXXXX format
 * @param phoneNumber - The phone number to normalize (10-digit number or with +63 prefix)
 * @returns Normalized phone number or empty string if invalid
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return ''
  
  // Remove any spaces, dashes, or parentheses
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '')
  
  // If already in +63 format, validate and return
  if (cleaned.startsWith('+63')) {
    const numberPart = cleaned.substring(3)
    if (PHONE_REGEX.test(numberPart)) {
      return `+63${numberPart}`
    }
    return ''
  }
  
  // If it's 10 digits, add +63 prefix
  if (cleaned.length === 10 && PHONE_REGEX.test(cleaned)) {
    return `+63${cleaned}`
  }
  
  // If it's 11 digits starting with 0, remove 0 and add +63
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const numberPart = cleaned.substring(1)
    if (PHONE_REGEX.test(numberPart)) {
      return `+63${numberPart}`
    }
  }
  
  return ''
}

/**
 * Formats a phone number for display (shows +63 prefix)
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber)
  if (!normalized) return phoneNumber // Return original if can't normalize
  
  // Format as +63 (XXX) XXX-XXXX for better readability
  const numberPart = normalized.substring(3)
  return `+63 (${numberPart.substring(0, 3)}) ${numberPart.substring(3, 6)}-${numberPart.substring(6)}`
}

/**
 * Gets the input placeholder for phone number fields
 * @returns Standardized placeholder text
 */
export function getPhonePlaceholder(): string {
  return "+63 (XXX) XXX-XXXX"
}

/**
 * Gets the input placeholder for GCash number fields
 * @returns Standardized placeholder text
 */
export function getGcashPlaceholder(): string {
  return "+63 (XXX) XXX-XXXX"
}

/**
 * Validates phone number input in real-time
 * @param value - Current input value (10-digit number only)
 * @returns Object with validation state and error message
 */
export function validatePhoneInput(value: string): {
  isValid: boolean
  error: string
  normalizedValue: string
} {
  if (!value.trim()) {
    return {
      isValid: true, // Empty is valid (not required until submit)
      error: '',
      normalizedValue: ''
    }
  }
  
  // Check if it's exactly 10 digits and starts with 9
  if (value.length === 10 && PHONE_REGEX.test(value)) {
    const normalized = `+63${value}`
    return {
      isValid: true,
      error: '',
      normalizedValue: normalized
    }
  }
  
  // If it's not 10 digits yet, it's still valid (user is typing)
  if (value.length < 10) {
    return {
      isValid: true,
      error: '',
      normalizedValue: value
    }
  }
  
  return {
    isValid: false,
    error: 'Please enter a valid 10-digit Philippine mobile number',
    normalizedValue: value
  }
}

/**
 * Handles phone number input change events
 * Automatically formats and validates the input
 * @param value - Current input value
 * @param onChange - Callback function to update the state
 */
export function handlePhoneInputChange(
  value: string,
  onChange: (value: string) => void
): void {
  // Remove any non-digit characters
  let cleaned = value.replace(/[^\d]/g, '')
  
  // Limit to 10 digits maximum
  if (cleaned.length <= 10) {
    onChange(cleaned)
  }
}
