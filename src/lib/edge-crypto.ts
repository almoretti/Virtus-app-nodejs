/**
 * Edge Runtime compatible crypto utilities
 * Uses Web Crypto API instead of Node.js crypto
 */

/**
 * Generate random bytes using Web Crypto API
 */
export async function randomBytes(length: number): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create SHA-256 hash using Web Crypto API
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return uint8ArrayToHex(hashArray);
}

/**
 * Generate secure random token
 */
export async function generateToken(length: number = 32): Promise<string> {
  const bytes = await randomBytes(length);
  return uint8ArrayToHex(bytes);
}