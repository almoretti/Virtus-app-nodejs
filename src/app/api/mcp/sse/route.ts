import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { server } from '@/mcp/lazy-server';
import { SSEServerTransport } from '@/mcp/sse-transport';
import { setSessionContext, removeSessionContext } from '@/mcp/mcp-context';

// Create a single SSE transport instance
let transport: SSEServerTransport | null = null;

function getSSETransport(): SSEServerTransport {
  if (!transport) {
    transport = new SSEServerTransport();
    // Connect the MCP server to the SSE transport
    // @ts-ignore - Transport type compatibility
    server.connect(transport);
  }
  return transport;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders
  });
}

// GET: Establish SSE connection (standard MCP SSE transport)
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get or create session ID
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId') || crypto.randomUUID();
    
    // Store auth context for this session
    setSessionContext(sessionId, {
      user: auth.user!,
      scopes: auth.scopes || []
    });
    
    // Get SSE transport and create connection
    const sseTransport = getSSETransport();
    const response = sseTransport.createSSEConnection(sessionId);
    
    // Clean up on disconnect
    sseTransport.once('session-closed', (closedSessionId) => {
      if (closedSessionId === sessionId) {
        removeSessionContext(sessionId);
      }
    });
    
    return response;
    
  } catch (error) {
    console.error('SSE connection error:', error);
    return NextResponse.json(
      { error: 'Failed to create SSE connection' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Handle MCP messages (standard JSON-RPC over HTTP)
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get session ID from query params
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Parse JSON-RPC message
    const message = await request.json();
    
    if (!message || !message.jsonrpc || message.jsonrpc !== "2.0") {
      return NextResponse.json(
        { 
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request"
          },
          id: message?.id || null
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get SSE transport and handle message
    const sseTransport = getSSETransport();
    
    // Set auth context for this request
    setSessionContext(sessionId, {
      user: auth.user!,
      scopes: auth.scopes || []
    });
    
    try {
      // Handle the message through the transport
      const response = await sseTransport.handleMessage(sessionId, message);
      
      if (response) {
        return NextResponse.json(response, { headers: corsHeaders });
      } else {
        // No response needed (notification)
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      
    } finally {
      // Don't remove context here - keep it for the session duration
    }
    
  } catch (error) {
    console.error('MCP message handling error:', error);
    
    let errorMessage = 'Internal server error';
    let errorCode = -32603;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('Session') && error.message.includes('not found')) {
        errorCode = -32000; // Custom error code for session issues
      }
    }
    
    return NextResponse.json(
      { 
        jsonrpc: "2.0",
        error: {
          code: errorCode,
          message: errorMessage
        },
        id: null
      },
      { status: 500, headers: corsHeaders }
    );
  }
}