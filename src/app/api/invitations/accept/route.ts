import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Token mancante" }, { status: 400 })
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json({ error: "Invito non valido" }, { status: 404 })
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invito scaduto" }, { status: 410 })
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json({ error: "Invito già utilizzato" }, { status: 400 })
    }

    // Check if email matches
    if (session.user.email !== invitation.email) {
      return NextResponse.json({ 
        error: `Devi accedere con l'email ${invitation.email}` 
      }, { status: 400 })
    }

    // Update user role and mark invitation as accepted
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { role: invitation.role },
      }),
      prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    // console.error("Error accepting invitation:", error)
    return NextResponse.json({ error: "Errore accettazione invito" }, { status: 500 })
  }
}