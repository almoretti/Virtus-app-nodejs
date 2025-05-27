import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Role } from "@prisma/client"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        technician: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

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
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Aggiornamento utente fallito" }, { status: 500 })
  }
}