import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { setSessionContext, removeSessionContext } from '@/mcp/mcp-context';
import { handleToolCall } from '@/mcp/tool-handlers';

// Manual SSE transport implementation that follows MCP protocol
// but avoids the SDK initialization issues
class MCPSSETransport {
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
          initialized: false
        };

        this.sessions.set(sessionId, session);

        // Send initial SSE connection established message
        this.sendSSEMessage(sessionId, {
          type: 'connection',
          status: 'connected',
          sessionId,
          timestamp: new Date().toISOString()
        });

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          if (this.sessions.has(sessionId)) {
            this.sendSSEMessage(sessionId, { type: 'ping' });
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
      removeSessionContext(sessionId);
    }
  }

  private sendSSEMessage(sessionId: string, data: any): boolean {
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

  async handleMCPMessage(sessionId: string, message: any, auth: any) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastActivity = new Date();

    // Handle MCP protocol methods
    switch (message.method) {
      case 'initialize':
        session.initialized = true;
        return {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "Virtus Booking MCP Server",
              version: "1.0.0"
            }
          }
        };

      case 'tools/list':
        if (!session.initialized) {
          throw new Error('Session not initialized');
        }
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

      case 'tools/call':
        if (!session.initialized) {
          throw new Error('Session not initialized');
        }
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

      default:
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
}

// Create a single transport instance
let transport: MCPSSETransport | null = null;

function getMCPTransport(): MCPSSETransport {
  if (!transport) {
    transport = new MCPSSETransport();
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

// GET: Establish SSE connection (MCP protocol compliant)
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
    
    // Get transport and create SSE connection
    const transport = getMCPTransport();
    const response = transport.createSSEConnection(sessionId);
    
    return response;
    
  } catch (error) {
    console.error('SSE connection error:', error);
    return NextResponse.json(
      { error: 'Failed to create SSE connection' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Handle MCP messages (JSON-RPC over HTTP)
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
    
    // Get transport and handle message
    const transport = getMCPTransport();
    
    // Set auth context for this request
    setSessionContext(sessionId, {
      user: auth.user!,
      scopes: auth.scopes || []
    });
    
    try {
      // Handle the MCP message through the transport
      const response = await transport.handleMCPMessage(sessionId, message, auth);
      
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