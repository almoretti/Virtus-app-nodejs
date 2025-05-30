import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';
import { setSessionContext, removeSessionContext, getSessionContext } from '@/mcp/mcp-context';
import { handleToolCall } from '@/mcp/tool-handlers';

// Dynamic import helper to avoid SDK initialization issues
async function loadMCPClasses() {
  try {
    const [
      { Server: McpServer },
      { SSEServerTransport },
      {
        ListToolsRequestSchema,
        CallToolRequestSchema
      }
    ] = await Promise.all([
      import('@modelcontextprotocol/sdk/server/index.js'),
      import('@modelcontextprotocol/sdk/server/sse.js'),
      import('@modelcontextprotocol/sdk/types.js')
    ]);
    return { McpServer, SSEServerTransport, ListToolsRequestSchema, CallToolRequestSchema };
  } catch (error) {
    console.error('Failed to load MCP SDK classes:', error);
    throw error;
  }
}

// MCP Server instance cache
let mcpServerInstance: any = null;
let sseTransportInstance: any = null;

// Create MCP Server with dynamic imports (avoids lazy loading issues)
async function createMCPServer(sessionId: string, auth: any) {
  try {
    console.log('Loading MCP SDK classes dynamically...');
    const { McpServer, SSEServerTransport, ListToolsRequestSchema, CallToolRequestSchema } = await loadMCPClasses();
    
    console.log('Creating MCP Server instance...');
    const server = new McpServer(
      {
        name: "Virtus Booking MCP Server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // List tools handler
    server.setRequestHandler(
      ListToolsRequestSchema,
      async () => {
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
      }
    );

    // Add tool call handler
    server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        try {
          // Set auth context for this session
          setSessionContext(sessionId, {
            user: auth.user!,
            scopes: auth.scopes || []
          });
          
          const result = await handleToolCall(request.params, auth);
          return result;
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Tool execution failed");
        }
      }
    );

    console.log('MCP Server created successfully');
    return { server, SSEServerTransport };
    
  } catch (error) {
    console.error('Failed to create MCP Server:', error);
    throw error;
  }
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

// GET: Establish SSE connection using official MCP SDK with dynamic imports
export async function GET(request: NextRequest) {
  try {
    // Debug: Log received headers
    console.log('SSE Request Headers:', {
      authorization: request.headers.get('authorization'),
      accept: request.headers.get('accept'),
      'user-agent': request.headers.get('user-agent'),
      allHeaders: Object.fromEntries(request.headers.entries())
    });

    // Validate authentication
    const auth = await validateApiAuth(request);
    if (!auth.success) {
      console.log('SSE Authentication failed:', auth.error);
      return NextResponse.json(
        { error: auth.error },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('SSE Authentication successful for user:', auth.user?.email);

    // Get or create session ID
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId') || crypto.randomUUID();
    
    // Store auth context for this session
    setSessionContext(sessionId, {
      user: auth.user!,
      scopes: auth.scopes || []
    });
    
    console.log('Creating MCP Server for session:', sessionId);

    try {
      // Create MCP server instance with dynamic imports
      const { server } = await createMCPServer(sessionId, auth);
      
      console.log('Creating custom SSE stream for Next.js...');
      
      // Create the SSE response stream
      const stream = new ReadableStream({
        start(controller) {
          console.log('SSE stream started');
          
          // Send endpoint event as required by MCP SSE specification
          const endpointEvent = `event: endpoint\ndata: /api/mcp/sse?sessionId=${sessionId}\n\n`;
          controller.enqueue(new TextEncoder().encode(endpointEvent));
          
          // Handle incoming messages via a message queue
          const messageQueue: any[] = [];
          let isProcessing = false;
          
          async function processMessage(message: any) {
            try {
              console.log('Processing MCP message:', message.method);
              
              // Process message through MCP server
              const response = await server.request(message);
              
              // Send response via SSE as message event
              const responseText = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
              controller.enqueue(new TextEncoder().encode(responseText));
              
            } catch (error) {
              console.error('Error processing MCP message:', error);
              
              // Send error response
              const errorResponse = {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: -32603,
                  message: error instanceof Error ? error.message : "Internal server error"
                }
              };
              
              const errorText = `event: message\ndata: ${JSON.stringify(errorResponse)}\n\n`;
              controller.enqueue(new TextEncoder().encode(errorText));
            }
          }
          
          async function processQueue() {
            if (isProcessing || messageQueue.length === 0) return;
            
            isProcessing = true;
            while (messageQueue.length > 0) {
              const message = messageQueue.shift();
              await processMessage(message);
            }
            isProcessing = false;
          }
          
          // Store message processor in session context for POST handler
          setSessionContext(sessionId, {
            user: auth.user!,
            scopes: auth.scopes || [],
            messageProcessor: (message: any) => {
              messageQueue.push(message);
              processQueue();
            }
          });
          
          // Send periodic ping to keep connection alive
          const pingInterval = setInterval(() => {
            try {
              const ping = `: ping ${new Date().toISOString()}\n\n`;
              controller.enqueue(new TextEncoder().encode(ping));
            } catch (error) {
              console.error('Error sending ping:', error);
              clearInterval(pingInterval);
            }
          }, 30000);
          
          // Store interval for cleanup
          (controller as any).pingInterval = pingInterval;
        },
        
        cancel() {
          console.log('SSE stream cancelled for session:', sessionId);
          
          // Clear ping interval
          const pingInterval = (this as any).pingInterval;
          if (pingInterval) {
            clearInterval(pingInterval);
          }
          
          removeSessionContext(sessionId);
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      });
      
    } catch (mcpError) {
      console.error('MCP Server creation failed:', mcpError);
      return NextResponse.json(
        { error: 'Failed to initialize MCP server: ' + (mcpError instanceof Error ? mcpError.message : 'Unknown error') },
        { status: 500, headers: corsHeaders }
      );
    }
    
  } catch (error) {
    console.error('SSE connection error:', error);
    return NextResponse.json(
      { error: 'Failed to create SSE connection: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Handle MCP messages (for HTTP-based clients)
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
    const sessionId = searchParams.get('sessionId') || crypto.randomUUID();
    
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
    
    console.log('Handling MCP message via POST:', message.method);
    
    try {
      // Get session context and message processor
      const context = sessionId ? getSessionContext(sessionId) : null;
      
      if (context?.messageProcessor) {
        // If SSE connection exists, route through SSE
        console.log('Routing message through active SSE connection');
        context.messageProcessor(message);
        
        // Return empty response body for SSE - response will come via SSE stream
        return new Response(null, { 
          status: 200, 
          headers: corsHeaders 
        });
        
      } else {
        // Direct processing for standalone requests
        console.log('Processing message directly (no SSE connection)');
        
        const { server } = await createMCPServer(sessionId, auth);
        const response = await server.request(message);
        
        return NextResponse.json(response, { headers: corsHeaders });
      }
      
    } catch (error) {
      console.error('MCP POST message handling error:', error);
      
      return NextResponse.json(
        { 
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error"
          },
          id: message?.id || null
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
  } catch (error) {
    console.error('POST request error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers: corsHeaders }
    );
  }
}