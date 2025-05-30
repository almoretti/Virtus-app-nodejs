import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListResourcesRequestSchema, 
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { TimeSlot } from "@prisma/client";
import { startOfDay, endOfDay, format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { getSessionContext } from './mcp-context';
import { validateUUID, validateDate, CustomerSchema, sanitizeHtml } from "@/lib/validation";

// Schema definitions for booking operations
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

// Helper functions
const slotMapping: Record<string, TimeSlot> = {
  'MORNING': TimeSlot.MORNING,
  'AFTERNOON': TimeSlot.AFTERNOON,
  'EVENING': TimeSlot.EVENING,
};

const slotDisplayMapping: Record<TimeSlot, string> = {
  [TimeSlot.MORNING]: "Mattina (10:00-12:00)",
  [TimeSlot.AFTERNOON]: "Pomeriggio (13:00-15:00)",
  [TimeSlot.EVENING]: "Sera (16:00-18:00)",
};

function formatBookingInfo(booking: any): string {
  const date = format(new Date(booking.date), "d MMMM yyyy", { locale: it });
  const slot = slotDisplayMapping[booking.slot];
  
  return `
**Prenotazione ID: ${booking.id}**
- **Data**: ${date}
- **Orario**: ${slot}
- **Cliente**: ${booking.customer.name}
- **Telefono**: ${booking.customer.phone}
- **Email**: ${booking.customer.email || 'Non specificata'}
- **Indirizzo**: ${booking.customer.address}
- **Tecnico**: ${booking.technician?.user?.name || booking.technician?.user?.email}
- **Tipo Installazione**: ${booking.installationType.name}
- **Stato**: ${booking.status}
- **Note**: ${booking.notes || 'Nessuna nota'}
- **Creata il**: ${format(new Date(booking.createdAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
`;
}

function formatAvailabilityInfo(availability: any): string {
  if (availability.date) {
    // Single date response
    const date = format(new Date(availability.date), "d MMMM yyyy", { locale: it });
    let result = `**Disponibilità per ${date}**\n\n`;
    
    Object.entries(availability.availability).forEach(([slot, techs]) => {
      const slotName = slotDisplayMapping[slot as TimeSlot];
      result += `**${slotName}:**\n`;
      
      availability.technicians.forEach((tech: any) => {
        const available = (techs as Record<string, boolean>)[tech.id];
        const status = available ? "✅ Disponibile" : "❌ Occupato";
        result += `- ${tech.name}: ${status}\n`;
      });
      result += "\n";
    });
    
    return result;
  } else {
    // Date range response
    let result = `**Disponibilità dal ${availability.from} al ${availability.to}**\n\n`;
    
    Object.entries(availability.availability).forEach(([dateKey, dayAvailability]) => {
      const date = format(new Date(dateKey), "d MMMM yyyy", { locale: it });
      result += `**${date}:**\n`;
      
      Object.entries(dayAvailability as Record<string, Record<string, boolean>>).forEach(([techId, slots]) => {
        const tech = availability.technicians.find((t: any) => t.id === techId);
        if (tech) {
          result += `- **${tech.name}**: `;
          const availableSlots = Object.entries(slots)
            .filter(([_, available]) => available)
            .map(([slot, _]) => slotDisplayMapping[slot as TimeSlot]);
          
          if (availableSlots.length > 0) {
            result += availableSlots.join(", ");
          } else {
            result += "Nessuna disponibilità";
          }
          result += "\n";
        }
      });
      result += "\n";
    });
    
    return result;
  }
}

// Create MCP server
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

// Tool: Check availability
server.tool(
  "check_availability",
  CheckAvailabilitySchema,
  async ({ date, technicianId }) => {
    try {
      // Validate date input
      const validDate = validateDate(date);
      if (!validDate) {
        return {
          content: [{
            type: "text",
            text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
          }]
        };
      }

      // Validate technician ID if provided
      if (technicianId) {
        const validTechnicianId = validateUUID(technicianId);
        if (!validTechnicianId) {
          return {
            content: [{
              type: "text",
              text: "❌ ID tecnico non valido. L'ID deve essere un UUID valido."
            }]
          };
        }
      }

      const dayStart = startOfDay(parseISO(date));
      const dayEnd = endOfDay(parseISO(date));

      // Get all active technicians or specific technician
      const whereClause: any = { active: true };
      if (technicianId) {
        whereClause.id = technicianId;
      }

      const technicians = await prisma.technician.findMany({
        where: whereClause,
        include: { user: true }
      });

      if (technicians.length === 0) {
        return {
          content: [{
            type: "text",
            text: technicianId 
              ? `Tecnico con ID ${technicianId} non trovato o non attivo.`
              : "Nessun tecnico attivo trovato."
          }]
        };
      }

      // Get bookings for the date
      const bookings = await prisma.booking.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          status: { in: ['SCHEDULED', 'COMPLETED'] },
          ...(technicianId && { technicianId })
        }
      });

      // Check technician availability (time off)
      const availability = await prisma.technicianAvailability.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
          available: false,
          ...(technicianId && { technicianId })
        }
      });

      // Build availability response
      const availabilityData = {
        date,
        technicians: technicians.map(tech => ({
          id: tech.id,
          name: tech.user.name || tech.user.email,
          color: tech.color
        })),
        availability: {
          'MORNING': {} as Record<string, boolean>,
          'AFTERNOON': {} as Record<string, boolean>,
          'EVENING': {} as Record<string, boolean>
        }
      };

      technicians.forEach(tech => {
        const isOnTimeOff = availability.some(a => a.technicianId === tech.id);
        
        Object.values(TimeSlot).forEach(slot => {
          const isBooked = bookings.some(b => b.technicianId === tech.id && b.slot === slot);
          availabilityData.availability[slot][tech.id] = !isOnTimeOff && !isBooked;
        });
      });

      return {
        content: [{
          type: "text",
          text: formatAvailabilityInfo(availabilityData)
        }]
      };

    } catch (error) {
      // console.error('Error checking availability:', error);
      return {
        content: [{
          type: "text",
          text: `Errore nel controllo della disponibilità: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        }]
      };
    }
  }
);

// Tool: Create booking
server.tool(
  "create_booking",
  CreateBookingSchema,
  async ({ date, slot, technicianId, customer, installationType, notes }, request) => {
    try {
      // Validate all inputs
      const validDate = validateDate(date);
      if (!validDate) {
        return {
          content: [{
            type: "text",
            text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
          }]
        };
      }

      const validTechnicianId = validateUUID(technicianId);
      if (!validTechnicianId) {
        return {
          content: [{
            type: "text",
            text: "❌ ID tecnico non valido. L'ID deve essere un UUID valido."
          }]
        };
      }

      // Validate and sanitize customer data
      try {
        const validatedCustomer = CustomerSchema.parse(customer);
        customer = {
          name: sanitizeHtml(validatedCustomer.name),
          phone: validatedCustomer.phone,
          email: validatedCustomer.email ? sanitizeHtml(validatedCustomer.email) : undefined,
          address: sanitizeHtml(validatedCustomer.address)
        };
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const errors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          return {
            content: [{
              type: "text",
              text: `❌ Dati cliente non validi: ${errors}`
            }]
          };
        }
      }

      // Sanitize notes if provided
      if (notes) {
        notes = sanitizeHtml(notes);
      }

      // Get authenticated user from session context
      const sessionId = (request as any)?.metadata?.sessionId;
      const context = sessionId ? getSessionContext(sessionId) : undefined;
      const userId = context?.userId;
      const bookingDate = parseISO(date);
      const timeSlot = slotMapping[slot];
      const now = new Date();
      const dayStart = startOfDay(bookingDate);
      const dayEnd = endOfDay(bookingDate);

      // Check if booking date is in the past
      if (bookingDate < now) {
        if (dayStart.toDateString() === now.toDateString()) {
          const currentHour = now.getHours();
          const slotHour = timeSlot === TimeSlot.MORNING ? 10 : 
                          timeSlot === TimeSlot.AFTERNOON ? 13 : 16;
          
          if (slotHour <= currentHour) {
            return {
              content: [{
                type: "text",
                text: "❌ Non è possibile prenotare appuntamenti nel passato."
              }]
            };
          }
        } else {
          return {
            content: [{
              type: "text",
              text: "❌ Non è possibile prenotare appuntamenti per date passate."
            }]
          };
        }
      }

      // Check if technician exists and is active
      const technician = await prisma.technician.findUnique({
        where: { id: technicianId },
        include: { user: true }
      });

      if (!technician || !technician.active) {
        return {
          content: [{
            type: "text",
            text: "❌ Tecnico non valido o non attivo."
          }]
        };
      }

      // Check if slot is already booked
      const existingBooking = await prisma.booking.findFirst({
        where: {
          technicianId,
          date: { gte: dayStart, lte: dayEnd },
          slot: timeSlot,
          status: { in: ['SCHEDULED', 'COMPLETED'] }
        }
      });

      if (existingBooking) {
        return {
          content: [{
            type: "text",
            text: `❌ La fascia oraria ${slotDisplayMapping[timeSlot]} è già prenotata per il tecnico ${technician.user.name || technician.user.email}.`
          }]
        };
      }

      // Check if technician is available (not on time off)
      const techAvailability = await prisma.technicianAvailability.findFirst({
        where: {
          technicianId,
          date: { gte: dayStart, lte: dayEnd },
          available: false
        }
      });

      if (techAvailability) {
        return {
          content: [{
            type: "text",
            text: `❌ Il tecnico ${technician.user.name || technician.user.email} non è disponibile in questa data.`
          }]
        };
      }

      // Find or create installation type
      let installationTypeRecord = await prisma.installationType.findUnique({
        where: { name: installationType }
      });

      if (!installationTypeRecord) {
        installationTypeRecord = await prisma.installationType.create({
          data: { name: installationType }
        });
      }

      // Create or find customer
      let customerRecord = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: customer.phone },
            ...(customer.email ? [{ email: customer.email }] : [])
          ]
        }
      });

      if (!customerRecord) {
        customerRecord = await prisma.customer.create({
          data: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email || null,
            address: customer.address,
          }
        });
      } else {
        // Update customer info if needed
        customerRecord = await prisma.customer.update({
          where: { id: customerRecord.id },
          data: {
            name: customer.name,
            address: customer.address,
            email: customer.email || customerRecord.email,
          }
        });
      }

      // Use authenticated user or fall back to system user
      let createdById = userId;
      
      if (!createdById) {
        // If no authenticated user (e.g., standalone mode), use system user
        const systemUser = await prisma.user.findFirst({
          where: { role: 'ADMIN' }
        });

        if (!systemUser) {
          return {
            content: [{
              type: "text",
              text: "❌ Errore di autenticazione: utente non autenticato e nessun utente di sistema trovato."
            }]
          };
        }
        
        createdById = systemUser.id;
      }

      const booking = await prisma.booking.create({
        data: {
          date: bookingDate,
          slot: timeSlot,
          customerId: customerRecord.id,
          technicianId,
          installationTypeId: installationTypeRecord.id,
          createdById: createdById,
          notes: notes || null,
        },
        include: {
          customer: true,
          technician: { include: { user: true } },
          installationType: true,
          createdBy: true,
        }
      });

      return {
        content: [{
          type: "text",
          text: `✅ **Prenotazione creata con successo!**\n\n${formatBookingInfo(booking)}`
        }]
      };

    } catch (error) {
      // console.error('Error creating booking:', error);
      return {
        content: [{
          type: "text",
          text: `❌ Errore nella creazione della prenotazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        }]
      };
    }
  }
);

// Tool: Modify booking
server.tool(
  "modify_booking",
  ModifyBookingSchema,
  async ({ bookingId, date, slot, technicianId, notes }) => {
    try {
      // Validate booking ID
      const validBookingId = validateUUID(bookingId);
      if (!validBookingId) {
        return {
          content: [{
            type: "text",
            text: "❌ ID prenotazione non valido. L'ID deve essere un UUID valido."
          }]
        };
      }

      // Validate date if provided
      if (date) {
        const validDate = validateDate(date);
        if (!validDate) {
          return {
            content: [{
              type: "text",
              text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
            }]
          };
        }
      }

      // Validate technician ID if provided
      if (technicianId) {
        const validTechnicianId = validateUUID(technicianId);
        if (!validTechnicianId) {
          return {
            content: [{
              type: "text",
              text: "❌ ID tecnico non valido. L'ID deve essere un UUID valido."
            }]
          };
        }
      }

      // Sanitize notes if provided
      if (notes) {
        notes = sanitizeHtml(notes);
      }

      // Find existing booking
      const existingBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          technician: { include: { user: true } },
          installationType: true
        }
      });

      if (!existingBooking) {
        return {
          content: [{
            type: "text",
            text: `❌ Prenotazione con ID ${bookingId} non trovata.`
          }]
        };
      }

      if (existingBooking.status === 'CANCELLED') {
        return {
          content: [{
            type: "text",
            text: "❌ Non è possibile modificare una prenotazione cancellata."
          }]
        };
      }

      // Prepare update data
      const updateData: any = {};
      
      if (date) {
        const newDate = parseISO(date);
        if (newDate < new Date()) {
          return {
            content: [{
              type: "text",
              text: "❌ Non è possibile spostare la prenotazione a una data passata."
            }]
          };
        }
        updateData.date = newDate;
      }

      if (slot) {
        updateData.slot = slotMapping[slot];
      }

      if (technicianId) {
        const technician = await prisma.technician.findUnique({
          where: { id: technicianId }
        });
        
        if (!technician || !technician.active) {
          return {
            content: [{
              type: "text",
              text: "❌ Tecnico non valido o non attivo."
            }]
          };
        }
        updateData.technicianId = technicianId;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      // Check for conflicts if date, slot, or technician changed
      if (date || slot || technicianId) {
        const checkDate = updateData.date || existingBooking.date;
        const checkSlot = updateData.slot || existingBooking.slot;
        const checkTechnicianId = updateData.technicianId || existingBooking.technicianId;
        
        const dayStart = startOfDay(checkDate);
        const dayEnd = endOfDay(checkDate);

        const conflictBooking = await prisma.booking.findFirst({
          where: {
            id: { not: bookingId },
            technicianId: checkTechnicianId,
            date: { gte: dayStart, lte: dayEnd },
            slot: checkSlot,
            status: { in: ['SCHEDULED', 'COMPLETED'] }
          }
        });

        if (conflictBooking) {
          return {
            content: [{
              type: "text",
              text: `❌ La nuova fascia oraria è già occupata da un'altra prenotazione.`
            }]
          };
        }
      }

      // Update booking
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          customer: true,
          technician: { include: { user: true } },
          installationType: true,
          createdBy: true,
        }
      });

      return {
        content: [{
          type: "text",
          text: `✅ **Prenotazione modificata con successo!**\n\n${formatBookingInfo(updatedBooking)}`
        }]
      };

    } catch (error) {
      // console.error('Error modifying booking:', error);
      return {
        content: [{
          type: "text",
          text: `❌ Errore nella modifica della prenotazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        }]
      };
    }
  }
);

// Tool: Cancel booking
server.tool(
  "cancel_booking",
  CancelBookingSchema,
  async ({ bookingId, reason }) => {
    try {
      // Validate booking ID
      const validBookingId = validateUUID(bookingId);
      if (!validBookingId) {
        return {
          content: [{
            type: "text",
            text: "❌ ID prenotazione non valido. L'ID deve essere un UUID valido."
          }]
        };
      }

      // Sanitize reason if provided
      if (reason) {
        reason = sanitizeHtml(reason);
      }

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          technician: { include: { user: true } },
          installationType: true
        }
      });

      if (!booking) {
        return {
          content: [{
            type: "text",
            text: `❌ Prenotazione con ID ${bookingId} non trovata.`
          }]
        };
      }

      if (booking.status === 'CANCELLED') {
        return {
          content: [{
            type: "text",
            text: "❌ La prenotazione è già stata cancellata."
          }]
        };
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          status: 'CANCELLED',
          notes: reason ? `${booking.notes || ''}\n\nMotivo cancellazione: ${reason}` : booking.notes
        },
        include: {
          customer: true,
          technician: { include: { user: true } },
          installationType: true,
          createdBy: true,
        }
      });

      return {
        content: [{
          type: "text",
          text: `✅ **Prenotazione cancellata con successo!**\n\n${formatBookingInfo(updatedBooking)}`
        }]
      };

    } catch (error) {
      // console.error('Error cancelling booking:', error);
      return {
        content: [{
          type: "text",
          text: `❌ Errore nella cancellazione della prenotazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        }]
      };
    }
  }
);

// Tool: Get bookings
server.tool(
  "get_bookings",
  GetBookingsSchema,
  async ({ date, from, to, status, technicianId }) => {
    try {
      // Validate dates
      if (date) {
        const validDate = validateDate(date);
        if (!validDate) {
          return {
            content: [{
              type: "text",
              text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
            }]
          };
        }
      }
      
      if (from) {
        const validFrom = validateDate(from);
        if (!validFrom) {
          return {
            content: [{
              type: "text",
              text: "❌ Data 'from' non valida. Usa il formato YYYY-MM-DD."
            }]
          };
        }
      }
      
      if (to) {
        const validTo = validateDate(to);
        if (!validTo) {
          return {
            content: [{
              type: "text",
              text: "❌ Data 'to' non valida. Usa il formato YYYY-MM-DD."
            }]
          };
        }
      }

      // Validate technician ID if provided
      if (technicianId) {
        const validTechnicianId = validateUUID(technicianId);
        if (!validTechnicianId) {
          return {
            content: [{
              type: "text",
              text: "❌ ID tecnico non valido. L'ID deve essere un UUID valido."
            }]
          };
        }
      }

      const whereClause: any = {
        status: { in: ['SCHEDULED', 'COMPLETED', 'CANCELLED'] }
      };

      // Date filtering
      if (date) {
        const queryDate = parseISO(date);
        const dayStart = startOfDay(queryDate);
        const dayEnd = endOfDay(queryDate);
        whereClause.date = { gte: dayStart, lte: dayEnd };
      } else if (from && to) {
        const fromDate = parseISO(from);
        const toDate = parseISO(to);
        
        if (toDate < fromDate) {
          return {
            content: [{
              type: "text",
              text: "❌ La data di fine deve essere successiva alla data di inizio."
            }]
          };
        }
        
        whereClause.date = {
          gte: startOfDay(fromDate),
          lte: endOfDay(toDate)
        };
      }

      // Status filtering
      if (status) {
        whereClause.status = status;
      }

      // Technician filtering
      if (technicianId) {
        whereClause.technicianId = technicianId;
      }

      const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
          customer: true,
          technician: { include: { user: true } },
          installationType: true,
          createdBy: true,
        },
        orderBy: { date: 'asc' }
      });

      if (bookings.length === 0) {
        return {
          content: [{
            type: "text",
            text: "ℹ️ Nessuna prenotazione trovata con i criteri specificati."
          }]
        };
      }

      let result = `**📅 Prenotazioni trovate: ${bookings.length}**\n\n`;
      bookings.forEach((booking, index) => {
        result += `${index + 1}. ${formatBookingInfo(booking)}\n---\n\n`;
      });

      return {
        content: [{
          type: "text",
          text: result
        }]
      };

    } catch (error) {
      // console.error('Error getting bookings:', error);
      return {
        content: [{
          type: "text",
          text: `❌ Errore nel recupero delle prenotazioni: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        }]
      };
    }
  }
);

// Resource: Real-time technicians list
// TODO: Fix ResourceTemplate import
/*
server.resource(
  "technicians://list",
  async () => {
    try {
      const technicians = await prisma.technician.findMany({
        where: { active: true },
        include: { user: true }
      });

      const techniciansList = technicians.map(tech => ({
        id: tech.id,
        name: tech.user.name || tech.user.email,
        email: tech.user.email,
        color: tech.color,
        active: tech.active
      }));

      return {
        contents: [{
          uri: "technicians://list",
          text: JSON.stringify(techniciansList, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: "technicians://list",
          text: JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
          mimeType: "application/json"
        }]
      };
    }
  }
);
*/

// Resource: Installation types
/*
server.resource(
  "installation-types://list",
  async () => {
    try {
      const installationTypes = await prisma.installationType.findMany({
        orderBy: { name: 'asc' }
      });

      return {
        contents: [{
          uri: "installation-types://list",
          text: JSON.stringify(installationTypes, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: "installation-types://list",
          text: JSON.stringify({ error: error instanceof Error ? error.message : 'Errore sconosciuto' }),
          mimeType: "application/json"
        }]
      };
    }
  }
);
*/

// Prompt: Booking assistance
server.prompt(
  "booking_assistant",
  {
    customerInfo: z.string().optional().describe("Informazioni del cliente"),
    preferredDate: z.string().optional().describe("Data preferita")
  },
  ({ customerInfo, preferredDate }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Aiuta il cliente a prenotare un appuntamento per l'installazione di un filtro per l'acqua.

${customerInfo ? `Informazioni cliente: ${customerInfo}` : ''}
${preferredDate ? `Data preferita: ${preferredDate}` : ''}

Per favore:
1. Controlla la disponibilità
2. Raccogli le informazioni necessarie del cliente (nome, telefono, indirizzo)
3. Conferma il tipo di installazione
4. Procedi con la prenotazione

Usa un tono professionale e cortese, sempre in italiano.`
      }
    }]
  })
);

export { server };