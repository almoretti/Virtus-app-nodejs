import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createHash, randomBytes } from "crypto";
import { getCSRFSecret } from "./secret-manager";

const CSRF_HEADER = "x-csrf-token";

// Generate a CSRF token
export function generateCSRFToken(sessionToken: string): string {
  const nonce = randomBytes(16).toString("hex");
  const csrfSecret = getCSRFSecret();
  const hash = createHash("sha256")
    .update(`${sessionToken}:${nonce}:${csrfSecret}`)
    .digest("hex");
  return `${nonce}:${hash}`;
}

// Validate a CSRF token
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  const parts = token.split(":");
  if (parts.length !== 2) return false;
  
  const [nonce, hash] = parts;
  const csrfSecret = getCSRFSecret();
  const expectedHash = createHash("sha256")
    .update(`${sessionToken}:${nonce}:${csrfSecret}`)
    .digest("hex");
  
  // Constant time comparison to prevent timing attacks
  return hash === expectedHash;
}

// Middleware to check CSRF token
export async function checkCSRF(req: NextRequest): Promise<{ valid: boolean; error?: string }> {
  // Skip CSRF check for GET requests and API token auth
  if (req.method === "GET" || req.headers.get("authorization")?.startsWith("Bearer ")) {
    return { valid: true };
  }

  // Get session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return { valid: false, error: "No valid session" };
  }

  // Get CSRF token from header
  const csrfToken = req.headers.get(CSRF_HEADER);
  if (!csrfToken) {
    return { valid: false, error: "Missing CSRF token" };
  }

  // Validate CSRF token
  if (!validateCSRFToken(csrfToken, token.sub)) {
    return { valid: false, error: "Invalid CSRF token" };
  }

  return { valid: true };
}

// API route to get CSRF token
export async function getCSRFTokenForSession(sessionId: string): Promise<string | null> {
  if (!sessionId) return null;
  return generateCSRFToken(sessionId);
}