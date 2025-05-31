import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyCsrfToken } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  try {
    // Verify CSRF token
    const csrfToken = request.headers.get('x-csrf-token')
    if (!csrfToken || !await verifyCsrfToken(csrfToken)) {
      return NextResponse.json(
        { error: 'Token CSRF non valido' },
        { status: 403 }
      )
    }

    // Verify user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    // Get the request body
    const body = await request.json()

    // Get webhook URL from environment or use default
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 
      'https://n8n.moretti.cc/webhook/f2d9fc80-ccdb-4bf6-ac48-27ada5830139'

    // Forward the request to n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any additional headers n8n might need
      },
      body: JSON.stringify({
        ...body,
        // Add user info for context
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name
        }
      })
    })

    // Check if n8n responded successfully
    if (!response.ok) {
      console.error('n8n webhook error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('n8n error response:', errorText)
      
      return NextResponse.json(
        { error: 'Errore nella comunicazione con il servizio chat' },
        { status: response.status }
      )
    }

    // Get the response from n8n
    const data = await response.json()

    // Return the response to the client
    return NextResponse.json(data)

  } catch (error) {
    console.error('Chat webhook error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}