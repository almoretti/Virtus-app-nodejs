import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { validateApiToken, extractTokenFromRequest } from './auth.js';
import { handleToolCall } from './tools.js';
import { prisma } from './db.js';
import type { Request, Response } from 'express';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const tokenCount = await prisma.apiToken.count();
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'virtus-mcp-server',
      version: '1.0.0',
      database: 'connected',
      apiTokens: tokenCount
    });
  } catch (error) {
    res.json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      service: 'virtus-mcp-server',
      version: '1.0.0',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Tool schemas for MCP
const CheckAvailabilitySchema = z.object({
  date: z.string().describe("Data in formato YYYY-MM-DD"),
  technicianId: z.string().optional().describe("ID specifico del tecnico (opzionale)")
});

const CreateBookingSchema = z.object({
  date: z.string().describe("Data appuntamento in formato YYYY-MM-DD"),
  slot: z.enum(["MORNING", "AFTERNOON", "EVENING"]).describe("Fascia oraria: MORNING (10-12), AFTERNOON (13-15), EVENING (16-18)"),
  technicianId: z.string().describe("ID del tecnico"),
  customer: z.object({
    name: z.string().describe("Nome del cliente"),
    phone: z.string().describe("Numero di telefono"),
    email: z.string().email().optional().describe("Email (opzionale)"),
    address: z.string().describe("Indirizzo")
  }),
  installationType: z.string().describe("Tipo di installazione"),
  notes: z.string().optional().describe("Note aggiuntive (opzionali)")
});

const ModifyBookingSchema = z.object({
  bookingId: z.string().describe("ID della prenotazione da modificare"),
  date: z.string().optional().describe("Nuova data (opzionale)"),
  slot: z.enum(["MORNING", "AFTERNOON", "EVENING"]).optional().describe("Nuova fascia oraria (opzionale)"),
  technicianId: z.string().optional().describe("Nuovo tecnico (opzionale)"),
  notes: z.string().optional().describe("Nuove note (opzionali)")
});

const CancelBookingSchema = z.object({
  bookingId: z.string().describe("ID della prenotazione da cancellare"),
  reason: z.string().optional().describe("Motivo della cancellazione (opzionale)")
});

const GetBookingsSchema = z.object({
  date: z.string().optional().describe("Data specifica (YYYY-MM-DD)"),
  from: z.string().optional().describe("Data inizio range (YYYY-MM-DD)"),
  to: z.string().optional().describe("Data fine range (YYYY-MM-DD)"),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional().describe("Filtro per stato"),
  technicianId: z.string().optional().describe("Filtro per tecnico")
});

// Create MCP Server instance
function createMCPServer(): Server {
  const server = new Server(
    {
      name: "virtus-booking-mcp",
      version: "1.0.0",
      description: "MCP server per il sistema di prenotazione Virtus - gestione appuntamenti tecnici per filtri acqua"
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
    }
  );

  // Register request handlers using proper MCP SDK API
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.log('Processing tools/list request');
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
              date: { type: "string", description: "Data appuntamento in formato YYYY-MM-DD" },
              slot: { type: "string", enum: ["MORNING", "AFTERNOON", "EVENING"], description: "Fascia oraria" },
              technicianId: { type: "string", description: "ID del tecnico" },
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
              installationType: { type: "string", description: "Tipo di installazione" },
              notes: { type: "string", description: "Note aggiuntive (opzionale)" }
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
              bookingId: { type: "string", description: "ID della prenotazione" },
              date: { type: "string", description: "Nuova data (opzionale)" },
              slot: { type: "string", enum: ["MORNING", "AFTERNOON", "EVENING"], description: "Nuova fascia oraria (opzionale)" },
              technicianId: { type: "string", description: "Nuovo tecnico (opzionale)" },
              notes: { type: "string", description: "Note aggiornate (opzionale)" }
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
              bookingId: { type: "string", description: "ID della prenotazione" },
              reason: { type: "string", description: "Motivo cancellazione (opzionale)" }
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
              date: { type: "string", description: "Data specifica (YYYY-MM-DD)" },
              from: { type: "string", description: "Data inizio range (YYYY-MM-DD)" },
              to: { type: "string", description: "Data fine range (YYYY-MM-DD)" },
              status: { type: "string", enum: ["SCHEDULED", "COMPLETED", "CANCELLED"], description: "Stato prenotazione" },
              technicianId: { type: "string", description: "ID tecnico specifico" }
            }
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.log('Processing tools/call request:', request.params.name);
    const result = await handleToolCall(request.params, {});
    return result;
  });

  return server;
}

// SSE endpoint for MCP communication
app.get('/mcp/sse', async (req: any, res: any) => {
  try {
    console.log('SSE connection request received');
    console.log('Request headers:', req.headers);
    
    // Validate authentication
    const token = extractTokenFromRequest(req);
    console.log('Extracted token:', token ? `${token.substring(0, 10)}...` : 'null');
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const auth = await validateApiToken(token);
    if (!auth.success) {
      console.log('SSE Authentication failed:', auth.error);
      return res.status(401).json({ error: auth.error });
    }

    console.log('SSE Authentication successful for user:', auth.user?.email);

    // Create MCP server instance with auth context
    const server = createMCPServer();
    
    // Create SSE transport
    const transport = new SSEServerTransport('/mcp/sse', res);
    
    try {
      // Connect server to transport (this automatically starts the transport)
      await server.connect(transport);
      
      console.log('MCP Server connected to SSE transport');
      
      // The transport is now handling the connection
      // Wait for client disconnect
      await new Promise<void>((resolve) => {
        req.on('close', () => {
          console.log('SSE client disconnected');
          resolve();
        });
        
        req.on('error', (error: any) => {
          console.error('SSE request error:', error);
          resolve();
        });
      });
      
      // Clean up
      await transport.close();
      await server.close();
      
    } catch (connectError) {
      console.error('Failed to connect transport:', connectError);
      throw connectError;
    }

  } catch (error) {
    console.error('SSE connection error:', error);
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to establish SSE connection: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  }
});

// HTTP POST endpoint for MCP messages (fallback)
app.post('/mcp/sse', async (req: any, res: any) => {
  try {
    // Validate authentication
    const token = extractTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const auth = await validateApiToken(token);
    if (!auth.success) {
      return res.status(401).json({ error: auth.error });
    }

    const message = req.body;
    
    if (!message || !message.jsonrpc || message.jsonrpc !== "2.0") {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request"
        },
        id: message?.id || null
      });
    }

    console.log('Processing MCP HTTP message:', message.method);

    // Create temporary MCP server for this request
    const server = createMCPServer();
    
    // Process the message directly
    let response;
    try {
      if (message.method === 'initialize') {
        response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "virtus-booking-mcp",
              version: "1.0.0"
            }
          }
        };
      } else if (message.method === 'tools/list') {
        response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            tools: [
              {
                name: "check_availability",
                description: "Controlla la disponibilità dei tecnici per una data specifica",
                inputSchema: CheckAvailabilitySchema
              },
              {
                name: "create_booking",
                description: "Crea una nuova prenotazione",
                inputSchema: CreateBookingSchema
              },
              {
                name: "modify_booking",
                description: "Modifica una prenotazione esistente",
                inputSchema: ModifyBookingSchema
              },
              {
                name: "cancel_booking",
                description: "Cancella una prenotazione",
                inputSchema: CancelBookingSchema
              },
              {
                name: "get_bookings",
                description: "Recupera le prenotazioni con filtri opzionali",
                inputSchema: GetBookingsSchema
              }
            ]
          }
        };
      } else if (message.method === 'tools/call') {
        const result = await handleToolCall(message.params, auth);
        response = {
          jsonrpc: "2.0",
          id: message.id,
          result
        };
      } else {
        response = {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: "Method not found"
          }
        };
      }
    } catch (error) {
      console.error('MCP message processing error:', error);
      response = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal server error"
        }
      };
    }

    res.json(response);

  } catch (error) {
    console.error('MCP HTTP endpoint error:', error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error"
      },
      id: null
    });
  }
});

// Debug endpoint (remove in production!)
app.get('/debug/tokens', async (req, res) => {
  try {
    const tokens = await prisma.apiToken.findMany({
      select: {
        id: true,
        name: true,
        token: true,
        isActive: true,
        createdAt: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });
    
    res.json({
      database_url: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 
        'not set',
      token_count: tokens.length,
      tokens: tokens.map(t => ({
        ...t,
        token: t.token.substring(0, 15) + '...'
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Database error',
      database_url: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 
        'not set'
    });
  }
});

// API info endpoint
app.get('/mcp/info', (req, res) => {
  res.json({
    name: "Virtus Booking MCP Server",
    version: "1.0.0",
    description: "MCP server per il sistema di prenotazione Virtus",
    capabilities: {
      tools: [
        "check_availability",
        "create_booking", 
        "modify_booking",
        "cancel_booking",
        "get_bookings"
      ]
    },
    endpoints: {
      sse: "/mcp/sse",
      http: "/mcp/sse"
    }
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /mcp/info', 
      'GET /mcp/sse',
      'POST /mcp/sse'
    ]
  });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const port = typeof PORT === 'string' ? parseInt(PORT) : PORT;
app.listen(port, HOST, () => {
  console.log(`🚀 Virtus MCP Server running on http://${HOST}:${port}`);
  console.log(`📡 SSE endpoint: http://${HOST}:${port}/mcp/sse`);
  console.log(`🔍 Health check: http://${HOST}:${port}/health`);
  console.log(`📖 API info: http://${HOST}:${port}/mcp/info`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Virtus MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Virtus MCP Server...');
  process.exit(0);
});