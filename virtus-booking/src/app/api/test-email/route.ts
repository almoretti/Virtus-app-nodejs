import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendTestEmail } from "@/lib/email"
import { Role } from "@prisma/client"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Only allow admins to test email
  if (!session || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email richiesta" }, { status: 400 })
    }

    await sendTestEmail(email)
    
    return NextResponse.json({ 
      success: true, 
      message: "Email di test inviata con successo!" 
    })
  } catch (error) {
    console.error("Error sending test email:", error)
    return NextResponse.json({ 
      error: "Errore invio email di test. Verifica la configurazione." 
    }, { status: 500 })
  }
}