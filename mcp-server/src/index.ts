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
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'virtus-mcp-server',
    version: '1.0.0'
  });
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
    return {
      tools: [
        {
          name: "check_availability",
          description: "Controlla la disponibilità dei tecnici per una data specifica",
          inputSchema: CheckAvailabilitySchema._def
        },
        {
          name: "create_booking",
          description: "Crea una nuova prenotazione", 
          inputSchema: CreateBookingSchema._def
        },
        {
          name: "modify_booking",
          description: "Modifica una prenotazione esistente",
          inputSchema: ModifyBookingSchema._def
        },
        {
          name: "cancel_booking",
          description: "Cancella una prenotazione",
          inputSchema: CancelBookingSchema._def
        },
        {
          name: "get_bookings",
          description: "Recupera le prenotazioni con filtri opzionali",
          inputSchema: GetBookingsSchema._def
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await handleToolCall(request.params, {});
    return result;
  });

  return server;
}

// SSE endpoint for MCP communication
app.get('/mcp/sse', async (req: any, res: any) => {
  try {
    console.log('SSE connection request received');
    
    // Validate authentication
    const token = extractTokenFromRequest(req as any);
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const auth = await validateApiToken(token);
    if (!auth.success) {
      console.log('SSE Authentication failed:', auth.error);
      return res.status(401).json({ error: auth.error });
    }

    console.log('SSE Authentication successful for user:', auth.user?.email);

    // Create MCP server instance
    const server = createMCPServer();
    
    // Create SSE transport
    const transport = new SSEServerTransport('/mcp/sse', res as any);
    
    // Connect server to transport
    await server.connect(transport);
    
    console.log('MCP Server connected to SSE transport');
    
    // Start the transport
    await transport.start();
    
    console.log('SSE transport started successfully');

    // Handle client disconnect
    req.on('close', async () => {
      console.log('SSE client disconnected');
      await transport.close();
    });

  } catch (error) {
    console.error('SSE connection error:', error);
    res.status(500).json({ 
      error: 'Failed to establish SSE connection: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

// HTTP POST endpoint for MCP messages (fallback)
app.post('/mcp/sse', async (req: any, res: any) => {
  try {
    // Validate authentication
    const token = extractTokenFromRequest(req as any);
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