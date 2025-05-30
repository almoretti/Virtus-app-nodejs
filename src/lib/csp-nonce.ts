import { headers } from 'next/headers';
import { randomBytes } from 'crypto';

/**
 * CSP Nonce utilities for production security
 * Generates unique nonces for inline scripts and styles
 */

// Store nonces for the current request
let currentNonce: string | null = null;

/**
 * Generate a new CSP nonce
 */
export function generateNonce(): string {
  if (typeof window !== 'undefined') {
    // Client-side: get nonce from meta tag
    const metaTag = document.querySelector('meta[name="csp-nonce"]');
    return metaTag?.getAttribute('content') || '';
  }
  
  // Server-side: generate new nonce
  if (!currentNonce) {
    currentNonce = randomBytes(16).toString('base64');
  }
  return currentNonce;
}

/**
 * Get the current request's nonce
 */
export function getCurrentNonce(): string {
  return currentNonce || generateNonce();
}

/**
 * Reset nonce for new request (called by middleware)
 */
export function resetNonce(): void {
  currentNonce = null;
}

/**
 * Get CSP header with nonce
 */
export function getCSPWithNonce(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https: blob:;
      connect-src 'self' https://accounts.google.com https://apis.google.com https://n8n.moretti.cc ws: wss:;
      frame-src 'self' https://accounts.google.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self';
    `.replace(/\s{2,}/g, ' ').trim();
  }

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://apis.google.com;
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https://cdn.jsdelivr.net blob:;
    connect-src 'self' https://accounts.google.com https://apis.google.com https://n8n.moretti.cc;
    frame-src 'self' https://accounts.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Get nonce meta tag HTML string
 */
export function getCSPNonceMetaTag(nonce: string): string {
  return `<meta name="csp-nonce" content="${nonce}">`;
}