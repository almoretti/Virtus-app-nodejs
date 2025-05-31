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

    // Check if webhook expects GET or POST (configurable)
    const useGetMethod = process.env.N8N_WEBHOOK_METHOD === 'GET' || true // Default to GET based on your n8n config
    
    let response: Response
    
    if (useGetMethod) {
      // For GET requests, send only essential data as query params
      const params = new URLSearchParams({
        message: body.message,
        sessionId: body.sessionId || 'default',
        userId: session.user?.email || 'anonymous',
        userName: session.user?.name || 'User'
      })
      
      const urlWithParams = `${webhookUrl}?${params.toString()}`
      
      response = await fetch(urlWithParams, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })
    } else {
      // For POST requests, send full payload
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          user: {
            id: session.user?.id,
            email: session.user?.email,
            name: session.user?.name
          }
        })
      })
    }

    // Check if n8n responded successfully
    if (!response.ok) {
      console.error('n8n webhook error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('n8n error response:', errorText)
      
      // Parse n8n error if possible
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.errorMessage?.includes('No Respond to Webhook node found')) {
          return NextResponse.json(
            { 
              error: 'Il servizio chat non è configurato correttamente. Contatta l\'amministratore.',
              details: 'Workflow n8n richiede un nodo "Respond to Webhook"'
            },
            { status: 503 }
          )
        }
      } catch (e) {
        // Not JSON, continue with generic error
      }
      
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