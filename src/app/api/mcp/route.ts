import { NextRequest, NextResponse } from 'next/server';
import { server } from '@/mcp/booking-server';
import { SSEServerTransport } from '@/mcp/sse-transport';
import { JSONRPCMessage, JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import { validateApiAuth } from '@/lib/api-auth';
import { setSessionContext, removeSessionContext } from '@/mcp/mcp-context';

// Global transport instance
let sseTransport: SSEServerTransport | null = null;

function getTransport(): SSEServerTransport {
  if (!sseTransport) {
    sseTransport = new SSEServerTransport();
    
    // Connect the MCP server to the transport
    // @ts-ignore - Transport type mismatch
    server.connect(sseTransport);
    
    // Set up event handlers
    sseTransport.on('session-created', (sessionId) => {
      // console.log(`New MCP session created: ${sessionId}`);
    });
    
    sseTransport.on('session-closed', (sessionId) => {
      // console.log(`MCP session closed: ${sessionId}`);
    });
    
    // Handle booking notifications
    sseTransport.on('booking-created', (booking) => {
      sseTransport?.notifyBookingChange('created', booking);
    });
    
    sseTransport.on('booking-updated', (booking) => {
      sseTransport?.notifyBookingChange('updated', booking);
    });
    
    sseTransport.on('booking-cancelled', (booking) => {
      sseTransport?.notifyBookingChange('cancelled', booking);
    });
  }
  
  return sseTransport;
}

// GET: Establish SSE connection
export async function GET(request: NextRequest) {
  try {
    // Validate API authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId') || crypto.randomUUID();
    
    // Store the authentication context for this session
    setSessionContext(sessionId, {
      userId: auth.user!.id,
      userEmail: auth.user!.email,
      userRole: auth.user!.role,
      scopes: auth.scopes || []
    });
    
    const transport = getTransport();
    const response = transport.createSSEConnection(sessionId);
    
    // Clean up context when session closes
    transport.once('session-closed', (closedSessionId) => {
      if (closedSessionId === sessionId) {
        removeSessionContext(sessionId);
      }
    });
    
    return response;
    
  } catch (error) {
    // console.error('Error creating SSE connection:', error);
    return NextResponse.json(
      { error: 'Failed to create SSE connection' },
      { status: 500 }
    );
  }
}

// POST: Handle MCP messages
export async function POST(request: NextRequest) {
  try {
    // Validate API authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON-RPC message' },
        { status: 400 }
      );
    }
    
    const message = body as JSONRPCMessage;
    
    // Validate JSON-RPC format
    if (!message.jsonrpc || message.jsonrpc !== "2.0") {
      return NextResponse.json(
        { 
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request"
          },
          id: 'id' in message ? message.id : null
        },
        { status: 400 }
      );
    }
    
    const transport = getTransport();
    
    // Add session ID to message metadata for authentication context
    if ('method' in message) {
      (message as any).metadata = { sessionId };
    }
    
    const response = await transport.handleMessage(sessionId, message);
    
    if (response) {
      return NextResponse.json(response);
    } else {
      // No response needed (notification)
      return NextResponse.json({ success: true });
    }
    
  } catch (error) {
    // console.error('Error handling MCP message:', error);
    
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error"
        },
        id: null
      },
      { status: 500 }
    );
  }
}

// OPTIONS: Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}