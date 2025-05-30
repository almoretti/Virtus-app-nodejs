import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Role } from "@prisma/client"
import { setImpersonation, clearImpersonation } from "@/lib/impersonation-store"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }
    
    // Only admins can impersonate
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 })
    }
    
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: "ID utente richiesto" }, { status: 400 })
    }
    
    // Can't impersonate yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Non puoi impersonare te stesso" }, { status: 400 })
    }
    
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!targetUser) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }
    
    // Store impersonation data server-side
    setImpersonation(session.user.id, {
      impersonatingUserId: userId,
      originalUserEmail: session.user.email
    })
    
    // Return success
    return NextResponse.json({ 
      success: true,
      impersonatingUserId: userId,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role
      }
    })
  } catch (error) {
    // console.error("Errore impersonazione:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }
    
    // Clear impersonation data server-side
    if (session.user.originalUserId) {
      clearImpersonation(session.user.originalUserId)
    } else {
      // If we don't have originalUserId in session, clear by current ID
      clearImpersonation(session.user.id)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    // console.error("Errore stop impersonazione:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}