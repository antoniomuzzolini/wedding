/**
 * Utility functions for encoding and decoding guest IDs
 * Supports both base64url encoding and backward compatibility with plain numeric IDs
 */

/**
 * Decodes a base64url-encoded guest ID
 * Supports both old and new format for backward compatibility
 */
export function decodeGuestId(encoded: string): number {
  if (typeof window !== 'undefined' && typeof atob !== 'undefined') {
    try {
      // Decode base64url (reverse the encoding: - to +, _ to /, add padding if needed)
      let base64 = encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/')
      
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '='
      }
      
      const decoded = atob(base64)
      // Try to extract ID from the decoded string (format: "ID-secret-timestamp")
      const match = decoded.match(/^(\d+)-/)
      if (match) {
        return parseInt(match[1])
      }
      // Fallback: try parsing the whole decoded string as number (backward compatibility)
      return parseInt(decoded)
    } catch {
      // If it fails, try parsing directly (for backward compatibility with old short URLs)
      return parseInt(encoded)
    }
  }
  // For SSR, try parsing directly
  return parseInt(encoded)
}

/**
 * Encodes a guest ID to base64url format
 * Creates a longer, more secure token by combining ID with a secret salt
 */
export function encodeGuestId(id: number): string {
  if (typeof window !== 'undefined' && typeof btoa !== 'undefined') {
    // Create a longer, more secure token by combining ID with a secret salt
    // This makes URLs longer and harder to guess
    // Format: "ID-secret-padding" where padding makes it consistently long
    const secret = 'wedding2026' // Simple secret for encoding
    const padding = String(id).padStart(6, '0').split('').reverse().join('') // Create padding from ID
    const combined = `${id}-${secret}-${padding}`
    const base64 = btoa(combined)
    // Use base64url encoding (replaces + with -, / with _, removes = padding)
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }
  return id.toString()
}

/**
 * Validates if a decoded guest ID is valid
 */
export function isValidGuestId(id: number): boolean {
  return !isNaN(id) && id > 0
}
