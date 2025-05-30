import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token mancante" }, { status: 400 })
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    })
  } catch (error) {
    // console.error("Error validating invitation:", error)
    return NextResponse.json({ error: "Errore validazione invito" }, { status: 500 })
  }
}