import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { getTransport } from '../route';
import { setSessionContext, removeSessionContext } from '@/mcp/mcp-context';

// CORS headers for n8n
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders
  });
}

// GET: Establish SSE connection for n8n
export async function GET(request: NextRequest) {
  try {
    // Validate API authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401, headers: corsHeaders }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId') || `n8n-${Date.now()}`;
    
    // Store the authentication context for this session
    setSessionContext(sessionId, {
      user: auth.user!,
      scopes: auth.scopes || []
    });
    
    // Create SSE stream for n8n
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connection',
          status: 'connected',
          sessionId: sessionId,
          capabilities: {
            tools: [
              'check_availability',
              'create_booking',
              'modify_booking',
              'cancel_booking',
              'get_bookings'
            ]
          }
        })}\n\n`));

        // Keep connection alive with periodic pings
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`:keepalive\n\n`));
          } catch (error) {
            clearInterval(keepAlive);
          }
        }, 30000);

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAlive);
          removeSessionContext(sessionId);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Error creating SSE connection for n8n:', error);
    return NextResponse.json(
      { error: 'Failed to create SSE connection' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Handle tool calls from n8n via SSE
export async function POST(request: NextRequest) {
  try {
    // Validate API authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { sessionId, tool, arguments: args } = body;

    if (!sessionId || !tool) {
      return NextResponse.json(
        { error: 'Missing sessionId or tool' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Import tool handlers
    const { handleToolCall } = await import('@/mcp/tool-handlers');
    
    try {
      // Execute the tool
      const result = await handleToolCall({
        name: tool,
        arguments: args
      }, auth);

      // Return the result
      return NextResponse.json({
        success: true,
        result: result,
        sessionId: sessionId
      }, {
        headers: corsHeaders
      });

    } catch (toolError) {
      console.error('Tool execution error:', toolError);
      return NextResponse.json({
        success: false,
        error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
        sessionId: sessionId
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('n8n MCP POST error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}