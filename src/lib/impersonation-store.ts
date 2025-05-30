// Server-side store for impersonation data
// In production, this should be stored in Redis or database

interface ImpersonationData {
  impersonatingUserId: string
  originalUserId: string
  originalUserEmail: string
  createdAt: Date
}

const impersonationStore = new Map<string, ImpersonationData>()
const IMPERSONATION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Cleanup old impersonations periodically
const cleanupInterval = setInterval(() => {
  const now = new Date();
  const timeout = IMPERSONATION_TIMEOUT_MS;
  
  for (const [userId, data] of impersonationStore.entries()) {
    if (now.getTime() - data.createdAt.getTime() > timeout) {
      impersonationStore.delete(userId);
    }
  }
}, 10 * 60 * 1000); // Run cleanup every 10 minutes

// Clear interval when module is unloaded
if (typeof process !== 'undefined') {
  process.on('exit', () => clearInterval(cleanupInterval));
}

export function setImpersonation(originalUserId: string, data: {
  impersonatingUserId: string
  originalUserEmail: string
}) {
  impersonationStore.set(originalUserId, {
    ...data,
    originalUserId,
    createdAt: new Date()
  })
}

export function getImpersonation(originalUserId: string) {
  return impersonationStore.get(originalUserId)
}

export function clearImpersonation(originalUserId: string) {
  impersonationStore.delete(originalUserId)
}

export function isImpersonating(originalUserId: string) {
  return impersonationStore.has(originalUserId)
}