// utils/redirect.ts

/**
 * Encode a redirect URL for safe use in query params
 */
export function encodeRedirect(url: string): string {
  return encodeURIComponent(url)
}

/**
 * Decode a redirect URL from query params
 */
export function decodeRedirect(encoded: string): string {
  try {
    return decodeURIComponent(encoded)
  } catch {
    return '/'
  }
}

/**
 * Check if a redirect URL is safe (internal only)
 * Only allow URLs starting with a single '/'
 */
export function isSafeRedirect(url: string): boolean {
  // Must start with a single slash, not double slash or protocol
  return /^\/[\w\-\/?#=&%.]*$/.test(url)
}
