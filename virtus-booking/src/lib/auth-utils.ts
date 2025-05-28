import { Session } from "next-auth"
import { Role } from "@prisma/client"

export interface EffectiveUser {
  id: string
  email: string
  name?: string | null
  role: Role
  isImpersonating: boolean
  actualUserId?: string
  actualUserEmail?: string
  actualUserRole?: Role
}

export function getEffectiveUser(session: Session | null): EffectiveUser | null {
  if (!session?.user) return null

  const user = session.user

  if (user.isImpersonating && user.originalUserId) {
    // When impersonating, return the impersonated user's data
    // but keep track of the actual user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isImpersonating: true,
      actualUserId: user.originalUserId,
      actualUserEmail: user.originalUserEmail,
      actualUserRole: Role.ADMIN // Only admins can impersonate
    }
  }

  // Normal user
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isImpersonating: false
  }
}