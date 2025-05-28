// Server-side store for impersonation data
// In production, this should be stored in Redis or database

const impersonationStore = new Map<string, {
  impersonatingUserId: string
  originalUserId: string
  originalUserEmail: string
}>()

export function setImpersonation(originalUserId: string, data: {
  impersonatingUserId: string
  originalUserEmail: string
}) {
  impersonationStore.set(originalUserId, {
    ...data,
    originalUserId
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