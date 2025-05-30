import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Role } from "@prisma/client"
import { prisma } from "./db"
import { getImpersonation } from "./impersonation-store"


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          });

          if (!existingUser) {
            // For new users, check if they have an invitation
            const invitation = await prisma.userInvitation.findUnique({
              where: { 
                email: user.email!,
                acceptedAt: null
              }
            });

            // If no invitation and no existing user, only allow specific emails
            const allowedEmails = ['alessandro@moretti.cc', 'admin@virtus.com'];
            if (!invitation && !allowedEmails.includes(user.email!)) {
              return false; // Reject sign in
            }
          }

          return true;
        } catch (error) {
          console.error('SignIn error:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token, user }) {
      if (session.user) {
        const userId = user?.id || token?.sub
        
        if (userId) {
          // Check if this user is impersonating someone
          const impersonationData = getImpersonation(userId)
          
          if (impersonationData) {
            // Fetch the impersonated user's data
            const impersonatedUser = await prisma.user.findUnique({
              where: { id: impersonationData.impersonatingUserId }
            })
            
            if (impersonatedUser) {
              session.user.id = impersonatedUser.id
              session.user.email = impersonatedUser.email!
              session.user.name = impersonatedUser.name
              session.user.image = impersonatedUser.image
              session.user.role = impersonatedUser.role as Role
              session.user.isImpersonating = true
              session.user.originalUserId = impersonationData.originalUserId
              session.user.originalUserEmail = impersonationData.originalUserEmail
            }
          } else if (user) {
            // Normal login with user object
            session.user.id = user.id
            session.user.role = (user as any).role || Role.CUSTOMER_SERVICE
            session.user.isImpersonating = false
          } else {
            // Session refresh
            session.user.id = userId
            session.user.isImpersonating = false
            // Fetch user data to get the role
            const dbUser = await prisma.user.findUnique({
              where: { id: userId }
            })
            if (dbUser) {
              session.user.role = dbUser.role as Role
            }
          }
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: Role
      isImpersonating?: boolean
      originalUserId?: string
      originalUserEmail?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    impersonatingUserId?: string
    originalUserId?: string
    originalUserEmail?: string
  }
}