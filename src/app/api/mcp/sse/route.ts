import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { setSessionContext, removeSessionContext } from '@/mcp/mcp-context';

// Import tool handlers directly instead of relying on the MCP server
import { handleToolCall } from '@/mcp/tool-handlers';

// Simple SSE implementation without the complex MCP server
class SimpleSSETransport {
  private sessions = new Map<string, any>();

  createSSEConnection(sessionId: string): Response {
    // Clean up existing session if any
    if (this.sessions.has(sessionId)) {
      this.closeSession(sessionId);
    }

    const stream = new ReadableStream({
      start: (controller) => {
        const session = {
          id: sessionId,
          controller,
          lastActivity: new Date(),
        };

        this.sessions.set(sessionId, session);

        // Send initial connection message
        this.sendToSession(sessionId, {
          type: 'connection-established',
          sessionId,
          timestamp: new Date().toISOString(),
          capabilities: {
            tools: ['check_availability', 'create_booking', 'modify_booking', 'cancel_booking', 'get_bookings']
          }
        });

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          if (this.sessions.has(sessionId)) {
            this.sendToSession(sessionId, { type: 'ping' });
          } else {
            clearInterval(keepAlive);
          }
        }, 30000);
      },
      cancel: () => {
        this.closeSession(sessionId);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  private closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.controller.close();
      } catch (error) {
        // Ignore close errors
      }
      this.sessions.delete(sessionId);
      // Clean up session context
      removeSessionContext(sessionId);
    }
  }

  private sendToSession(sessionId: string, data: any): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      session.controller.enqueue(new TextEncoder().encode(message));
      session.lastActivity = new Date();
      return true;
    } catch (error) {
      this.closeSession(sessionId);
      return false;
    }
  }

  async handleMessage(sessionId: string, message: any, auth: any) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastActivity = new Date();

    // Handle different MCP methods
    if (message.method === 'initialize') {
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: "1.0",
          serverInfo: {
            name: "Virtus Booking MCP Server",
            version: "1.0.0"
          },
          capabilities: {
            tools: {}
          }
        }
      };
    }

    if (message.method === 'tools/list') {
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
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
        }
      };
    }

    if (message.method === 'tools/call') {
      try {
        const result = await handleToolCall(message.params, auth);
        return {
          jsonrpc: "2.0",
          id: message.id,
          result
        };
      } catch (error) {
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Tool execution failed"
          }
        };
      }
    }

    // Method not found
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: {
        code: -32601,
        message: "Method not found"
      }
    };
  }
}

// Create a single SSE transport instance
let transport: SimpleSSETransport | null = null;

function getSSETransport(): SimpleSSETransport {
  if (!transport) {
    transport = new SimpleSSETransport();
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
    
    // Store cleanup handler for later use
    // Note: cleanup will be handled when session closes naturally
    
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
      const response = await sseTransport.handleMessage(sessionId, message, auth);
      
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