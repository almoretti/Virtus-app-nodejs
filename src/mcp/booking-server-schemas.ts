import { z } from "zod";
import { TimeSlot } from "@prisma/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Schema definitions for booking operations
export const CheckAvailabilitySchema = z.object({
  date: z.string().describe("Data in formato YYYY-MM-DD"),
  technicianId: z.string().optional().describe("ID specifico del tecnico (opzionale)")
});

export const CreateBookingSchema = z.object({
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

export const ModifyBookingSchema = z.object({
  bookingId: z.string().describe("ID della prenotazione da modificare"),
  date: z.string().optional().describe("Nuova data (opzionale)"),
  slot: z.enum(["MORNING", "AFTERNOON", "EVENING"]).optional().describe("Nuova fascia oraria (opzionale)"),
  technicianId: z.string().optional().describe("Nuovo tecnico (opzionale)"),
  notes: z.string().optional().describe("Nuove note (opzionali)")
});

export const CancelBookingSchema = z.object({
  bookingId: z.string().describe("ID della prenotazione da cancellare"),
  reason: z.string().optional().describe("Motivo della cancellazione (opzionale)")
});

export const GetBookingsSchema = z.object({
  date: z.string().optional().describe("Data specifica (YYYY-MM-DD)"),
  from: z.string().optional().describe("Data inizio range (YYYY-MM-DD)"),
  to: z.string().optional().describe("Data fine range (YYYY-MM-DD)"),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional().describe("Filtro per stato"),
  technicianId: z.string().optional().describe("Filtro per tecnico")
});

// Helper mappings
export const slotMapping: Record<string, TimeSlot> = {
  'MORNING': TimeSlot.MORNING,
  'AFTERNOON': TimeSlot.AFTERNOON,
  'EVENING': TimeSlot.EVENING,
};

export const slotDisplayMapping: Record<TimeSlot, string> = {
  [TimeSlot.MORNING]: "Mattina (10:00-12:00)",
  [TimeSlot.AFTERNOON]: "Pomeriggio (13:00-15:00)",
  [TimeSlot.EVENING]: "Sera (16:00-18:00)",
};

// Formatting functions
export function formatBookingInfo(booking: any): string {
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

export function formatAvailabilityInfo(availability: any): string {
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