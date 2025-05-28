import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  return NextResponse.json({
    session,
    isImpersonating: session?.user?.isImpersonating,
    role: session?.user?.role,
    originalUserId: session?.user?.originalUserId
  })
}