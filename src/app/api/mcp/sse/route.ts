import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { setSessionContext, removeSessionContext } from '@/mcp/mcp-context';
import { SSEServerTransport } from '@/mcp/sse-transport';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall } from '@/mcp/tool-handlers';

// Create MCP server instance with proper tool definitions
function createMCPServer() {
  const server = new Server(
    {
      name: 'virtus-booking-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define all booking tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "check_availability",
          description: "Controlla la disponibilità dei tecnici per una data specifica",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string", description: "Data in formato YYYY-MM-DD" },
              technicianId: { type: "string", description: "ID specifico del tecnico (opzionale)" }
            },
            required: ["date"]
          }
        },
        {
          name: "create_booking",
          description: "Crea una nuova prenotazione",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string" },
              slot: { type: "string", enum: ["MORNING", "AFTERNOON", "EVENING"] },
              technicianId: { type: "string" },
              customer: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" },
                  address: { type: "string" }
                },
                required: ["name", "phone", "address"]
              },
              installationType: { type: "string" },
              notes: { type: "string" }
            },
            required: ["date", "slot", "technicianId", "customer", "installationType"]
          }
        },
        {
          name: "modify_booking",
          description: "Modifica una prenotazione esistente",
          inputSchema: {
            type: "object",
            properties: {
              bookingId: { type: "string" },
              date: { type: "string" },
              slot: { type: "string", enum: ["MORNING", "AFTERNOON", "EVENING"] },
              technicianId: { type: "string" },
              notes: { type: "string" }
            },
            required: ["bookingId"]
          }
        },
        {
          name: "cancel_booking",
          description: "Cancella una prenotazione",
          inputSchema: {
            type: "object",
            properties: {
              bookingId: { type: "string" },
              reason: { type: "string" }
            },
            required: ["bookingId"]
          }
        },
        {
          name: "get_bookings",
          description: "Recupera le prenotazioni con filtri opzionali",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string" },
              from: { type: "string" },
              to: { type: "string" },
              status: { type: "string", enum: ["SCHEDULED", "COMPLETED", "CANCELLED"] },
              technicianId: { type: "string" }
            }
          }
        }
      ]
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    
    // Get auth context from message metadata or session context
    let auth = (extra as any)?._auth;
    if (!auth) {
      // Try to get from session context if available
      const sessionId = (extra as any)?._sessionId;
      if (sessionId) {
        // This would need to be implemented to get auth from session storage
        console.warn('Auth context not found in request, using default');
        auth = { user: { id: 'system', email: 'system', role: 'ADMIN' } };
      }
    }
    
    try {
      const result = await handleToolCall({ name, arguments: args }, auth);
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Tool execution failed');
    }
  });

  return server;
}

// Create global instances
let mcpServer: Server | null = null;
let sseTransport: SSEServerTransport | null = null;

function getServerAndTransport() {
  if (!mcpServer || !sseTransport) {
    mcpServer = createMCPServer();
    sseTransport = new SSEServerTransport();
    
    // Connect them together
    mcpServer.connect(sseTransport);
  }
  
  return { server: mcpServer, transport: sseTransport };
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
    
    // Get MCP server and transport
    const { transport } = getServerAndTransport();
    const response = transport.createSSEConnection(sessionId);
    
    // Set up cleanup when transport closes
    transport.once('session-closed', (closedSessionId: string) => {
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
    
    // Get MCP server and transport
    const { transport } = getServerAndTransport();
    
    // Set auth context for this request
    setSessionContext(sessionId, {
      user: auth.user!,
      scopes: auth.scopes || []
    });
    
    try {
      // Handle the message through the transport with auth context
      const response = await transport.handleMessage(sessionId, {
        ...message,
        // Add auth context to the message metadata
        _auth: auth
      });
      
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