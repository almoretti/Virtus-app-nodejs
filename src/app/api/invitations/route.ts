import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Role } from "@prisma/client"
import { sendInvitationEmail } from "@/lib/email"
import { getEffectiveUser } from "@/lib/auth-utils"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
  
  const effectiveUser = getEffectiveUser(session)
  if (effectiveUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const invitations = await prisma.userInvitation.findMany({
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json({ error: "Recupero inviti fallito" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
  
  const effectiveUser = getEffectiveUser(session)
  if (effectiveUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { email, role } = await req.json()

    if (!email || !role) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Utente già esistente" }, { status: 400 })
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.userInvitation.findUnique({
      where: { email },
    })

    if (existingInvitation && !existingInvitation.acceptedAt) {
      return NextResponse.json({ error: "Invito già inviato a questo indirizzo email" }, { status: 400 })
    }

    // Create invitation with 7 days expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.userInvitation.create({
      data: {
        email,
        role,
        expiresAt,
        invitedById: session.user.id,
      },
    })

    const invitationLink = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${invitation.token}`
    
    // Send invitation email
    try {
      await sendInvitationEmail({
        to: email,
        inviterName: session.user.name || session.user.email || 'Admin',
        invitationLink,
        role,
        expiresAt,
      })
      console.log("Invitation email sent successfully to:", email)
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError)
      // Delete the invitation if email fails
      await prisma.userInvitation.delete({ where: { id: invitation.id } })
      return NextResponse.json({ 
        error: "Invio email fallito. Verifica l'indirizzo email e riprova." 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        // Include the link for development/testing
        invitationLink: process.env.NODE_ENV === "development" ? invitationLink : undefined,
      },
    })
  } catch (error) {
    console.error("Error creating invitation:", error)
    return NextResponse.json({ error: "Creazione invito fallita" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
  
  const effectiveUser = getEffectiveUser(session)
  if (effectiveUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const invitationId = searchParams.get("id")

    if (!invitationId) {
      return NextResponse.json({ error: "ID invito mancante" }, { status: 400 })
    }

    await prisma.userInvitation.delete({
      where: { id: invitationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invitation:", error)
    return NextResponse.json({ error: "Eliminazione invito fallita" }, { status: 500 })
  }
}