import { NextRequest, NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/api-auth';

// This endpoint returns the list of available tools for n8n MCP discovery
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

    // Return the tools in n8n-compatible format
    const tools = {
      tools: [
        {
          name: "check_availability",
          description: "Controlla la disponibilità dei tecnici per una data specifica",
          inputSchema: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "Data in formato YYYY-MM-DD"
              },
              technicianId: {
                type: "string",
                description: "ID specifico del tecnico (opzionale)"
              }
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
              date: {
                type: "string",
                description: "Data appuntamento in formato YYYY-MM-DD"
              },
              slot: {
                type: "string",
                enum: ["MORNING", "AFTERNOON", "EVENING"],
                description: "Fascia oraria: MORNING (10-12), AFTERNOON (13-15), EVENING (16-18)"
              },
              technicianId: {
                type: "string",
                description: "ID del tecnico"
              },
              customer: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome del cliente" },
                  phone: { type: "string", description: "Numero di telefono" },
                  email: { type: "string", description: "Email (opzionale)" },
                  address: { type: "string", description: "Indirizzo" }
                },
                required: ["name", "phone", "address"]
              },
              installationType: {
                type: "string",
                description: "Tipo di installazione"
              },
              notes: {
                type: "string",
                description: "Note aggiuntive (opzionali)"
              }
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
              bookingId: {
                type: "string",
                description: "ID della prenotazione da modificare"
              },
              date: {
                type: "string",
                description: "Nuova data (opzionale)"
              },
              slot: {
                type: "string",
                enum: ["MORNING", "AFTERNOON", "EVENING"],
                description: "Nuova fascia oraria (opzionale)"
              },
              technicianId: {
                type: "string",
                description: "Nuovo tecnico (opzionale)"
              },
              notes: {
                type: "string",
                description: "Nuove note (opzionali)"
              }
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
              bookingId: {
                type: "string",
                description: "ID della prenotazione da cancellare"
              },
              reason: {
                type: "string",
                description: "Motivo della cancellazione (opzionale)"
              }
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
              date: {
                type: "string",
                description: "Data specifica (YYYY-MM-DD)"
              },
              from: {
                type: "string",
                description: "Data inizio range (YYYY-MM-DD)"
              },
              to: {
                type: "string",
                description: "Data fine range (YYYY-MM-DD)"
              },
              status: {
                type: "string",
                enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
                description: "Filtro per stato"
              },
              technicianId: {
                type: "string",
                description: "Filtro per tecnico"
              }
            },
            required: []
          }
        }
      ]
    };

    return NextResponse.json(tools);
  } catch (error) {
    console.error('Error returning tools list:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve tools' },
      { status: 500 }
    );
  }
}