import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { server } from '@/mcp/lazy-server';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { setSessionContext, removeSessionContext } from '@/mcp/mcp-context';

// CORS headers for n8n compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { 
    status: 200,
    headers: corsHeaders
  });
}

// Simple JSON-RPC handler for n8n compatibility
export async function POST(request: NextRequest) {
  try {
    // Log incoming request for debugging
    console.log('MCP v1 request:', {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      url: request.url
    });

    // Validate API authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { 
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: auth.error || "Authentication required"
          },
          id: null
        },
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    const body = await request.json();
    console.log('MCP v1 body:', body);
    
    // Validate JSON-RPC request
    if (!body.jsonrpc || body.jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request"
        },
        id: body.id || null
      }, {
        headers: corsHeaders
      });
    }

    // Set session context for this request
    const sessionId = `n8n-${auth.user?.id}-${Date.now()}`;
    setSessionContext(sessionId, {
      user: auth.user!,
      scopes: auth.scopes || []
    });

    try {
      // Handle the request based on method
      let result;
      
      switch (body.method) {
        case "initialize":
          result = {
            protocolVersion: "1.0",
            serverInfo: {
              name: "Virtus Booking MCP Server",
              version: "1.0.0"
            },
            capabilities: {
              tools: true
            }
          };
          break;

        case "tools/list":
          result = {
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
          break;

        case "tools/call":
          // Process the tool call directly
          const message: JSONRPCMessage = {
            jsonrpc: "2.0",
            id: body.id,
            method: "tools/call",
            params: body.params
          };
          
          // Process through MCP server
          try {
            // Import the booking server functions directly
            const { handleToolCall } = await import('@/mcp/tool-handlers');
            result = await handleToolCall(body.params, auth);
          } catch (toolError) {
            console.error('Tool execution error:', toolError);
            return NextResponse.json({
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message: toolError instanceof Error ? toolError.message : "Tool execution failed"
              },
              id: body.id
            }, {
              headers: corsHeaders
            });
          }
          break;

        default:
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: "Method not found"
            },
            id: body.id
          }, {
            headers: corsHeaders
          });
      }

      console.log('MCP v1 response:', { result, id: body.id });

      return NextResponse.json({
        jsonrpc: "2.0",
        result,
        id: body.id
      }, {
        headers: corsHeaders
      });

    } finally {
      // Clean up session context
      removeSessionContext(sessionId);
    }

  } catch (error) {
    console.error('MCP v1 error:', error);
    
    // Try to extract ID from request body if possible
    let requestId = null;
    try {
      const body = await request.json().catch(() => ({}));
      requestId = body.id || null;
    } catch {}
    
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error"
      },
      id: requestId
    }, {
      headers: corsHeaders
    });
  }
}