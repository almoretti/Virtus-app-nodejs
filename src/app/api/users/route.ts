import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Role } from "@prisma/client"
import { validateApiAuth, hasScope } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    console.log("Users API - Starting authentication check")
    const auth = await validateApiAuth(request)
    
    if (!auth.success) {
      console.error("Users API - Auth failed:", auth.error)
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    console.log("Users API - Auth successful:", { type: auth.type, userRole: auth.user?.role, scopes: auth.scopes })

    // Check if user has read permission and is admin
    if (!hasScope(auth.scopes, 'read') || auth.user?.role !== 'ADMIN') {
      console.error("Users API - Insufficient permissions:", { role: auth.user?.role, scopes: auth.scopes })
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        technician: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(`Found ${users.length} users`)
    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Recupero utenti fallito" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { userId, role } = await req.json()

    if (!userId || !role) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    // console.error("Error updating user:", error)
    return NextResponse.json({ error: "Aggiornamento utente fallito" }, { status: 500 })
  }
}