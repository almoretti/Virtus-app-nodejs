import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Role } from "@prisma/client"
import { getEffectiveUser } from "@/lib/auth-utils"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const technicians = await prisma.technician.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(technicians)
  } catch (error) {
    console.error("Error fetching technicians:", error)
    return NextResponse.json({ error: "Recupero tecnici fallito" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const effectiveUser = getEffectiveUser(session)
  
  if (!effectiveUser || effectiveUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { userId, color } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    // Update user role to TECHNICIAN
    await prisma.user.update({
      where: { id: userId },
      data: { role: Role.TECHNICIAN },
    })

    // Create technician record
    const technician = await prisma.technician.create({
      data: {
        userId,
        color: color || "#3B82F6",
      },
      include: {
        user: true,
      },
    })

    return NextResponse.json(technician)
  } catch (error) {
    console.error("Error creating technician:", error)
    return NextResponse.json({ error: "Creazione tecnico fallita" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { technicianId, name, color, active } = await req.json()

    if (!technicianId) {
      return NextResponse.json({ error: "ID tecnico mancante" }, { status: 400 })
    }

    const updateData: any = {}
    
    if (color !== undefined) {
      updateData.color = color
    }
    
    if (active !== undefined) {
      updateData.active = active
    }

    // Update technician
    const technician = await prisma.technician.update({
      where: { id: technicianId },
      data: updateData,
      include: {
        user: true,
      },
    })

    // Update user name if provided
    if (name !== undefined) {
      await prisma.user.update({
        where: { id: technician.userId },
        data: { name },
      })
    }

    // Refetch to get updated data
    const updatedTechnician = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: {
        user: true,
      },
    })

    return NextResponse.json(updatedTechnician)
  } catch (error) {
    console.error("Error updating technician:", error)
    return NextResponse.json({ error: "Aggiornamento tecnico fallito" }, { status: 500 })
  }
}