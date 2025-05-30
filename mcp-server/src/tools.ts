import { prisma } from './db.js';
import { TimeSlot, BookingStatus } from '@prisma/client';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { z } from 'zod';

// Validation schemas
const CustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().min(1)
});

// Utility functions
function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function validateDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString + 'T00:00:00.000Z');
  return !isNaN(date.getTime());
}

function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

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
  const slot = slotDisplayMapping[booking.slot as TimeSlot];
  
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

export async function handleToolCall(params: any, auth: any) {
  const { name, arguments: args } = params;

  switch (name) {
    case "check_availability":
      return await checkAvailability(args, auth);
    case "create_booking":
      return await createBooking(args, auth);
    case "modify_booking":
      return await modifyBooking(args, auth);
    case "cancel_booking":
      return await cancelBooking(args, auth);
    case "get_bookings":
      return await getBookings(args, auth);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function checkAvailability(args: any, auth: any) {
  const { date, technicianId } = args;
  
  if (!validateDate(date)) {
    return {
      content: [{
        type: "text",
        text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
      }]
    };
  }

  if (technicianId && !validateUUID(technicianId)) {
    return {
      content: [{
        type: "text", 
        text: "❌ ID tecnico non valido. L'ID deve essere un UUID valido."
      }]
    };
  }

  const targetDate = parseISO(date);
  const startDate = startOfDay(targetDate);
  const endDate = endOfDay(targetDate);

  // Get technicians
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
      date: { gte: startDate, lte: endDate },
      status: { in: ['SCHEDULED', 'COMPLETED'] },
      ...(technicianId && { technicianId })
    }
  });

  // Check technician availability (time off)
  const availability = await prisma.technicianAvailability.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      available: false,
      ...(technicianId && { technicianId })
    }
  });

  // Build availability response
  const availabilityData = {
    date,
    technicians: technicians.map((tech: any) => ({
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

  technicians.forEach((tech: any) => {
    const isOnTimeOff = availability.some((a: any) => a.technicianId === tech.id);
    
    Object.values(TimeSlot).forEach((slot: any) => {
      const isBooked = bookings.some((b: any) => b.technicianId === tech.id && b.slot === slot);
      (availabilityData.availability as any)[slot][tech.id] = !isOnTimeOff && !isBooked;
    });
  });

  return {
    content: [{
      type: "text",
      text: formatAvailabilityInfo(availabilityData)
    }]
  };
}

async function createBooking(args: any, auth: any) {
  const { date, slot, technicianId, customer, installationType, notes } = args;
  
  // Validation
  if (!validateDate(date)) {
    return {
      content: [{
        type: "text",
        text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
      }]
    };
  }

  if (!validateUUID(technicianId)) {
    return {
      content: [{
        type: "text",
        text: "❌ ID tecnico non valido. L'ID deve essere un UUID valido."
      }]
    };
  }

  // Validate customer data
  try {
    const validatedCustomer = CustomerSchema.parse(customer);
    
    const bookingDate = parseISO(date);
    const timeSlot = slotMapping[slot];
    const now = new Date();

    // Check if booking date is in the past
    if (bookingDate < now) {
      return {
        content: [{
          type: "text",
          text: "❌ Non è possibile prenotare appuntamenti per date passate."
        }]
      };
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
    const dayStart = startOfDay(bookingDate);
    const dayEnd = endOfDay(bookingDate);
    
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
          { phone: validatedCustomer.phone },
          ...(validatedCustomer.email ? [{ email: validatedCustomer.email }] : [])
        ]
      }
    });

    if (!customerRecord) {
      customerRecord = await prisma.customer.create({
        data: {
          name: sanitizeHtml(validatedCustomer.name),
          phone: validatedCustomer.phone,
          email: validatedCustomer.email || null,
          address: sanitizeHtml(validatedCustomer.address),
        }
      });
    }

    // Get system user for booking creation
    const systemUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!systemUser) {
      return {
        content: [{
          type: "text",
          text: "❌ Errore di sistema: utente amministratore non trovato."
        }]
      };
    }

    const booking = await prisma.booking.create({
      data: {
        date: bookingDate,
        slot: timeSlot,
        customerId: customerRecord.id,
        technicianId,
        installationTypeId: installationTypeRecord.id,
        createdById: systemUser.id,
        notes: notes ? sanitizeHtml(notes) : null,
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
    throw validationError;
  }
}

async function modifyBooking(args: any, auth: any) {
  // Implementation similar to existing but adapted for standalone server
  const { bookingId, date, slot, technicianId, notes } = args;
  
  if (!validateUUID(bookingId)) {
    return {
      content: [{
        type: "text",
        text: "❌ ID prenotazione non valido."
      }]
    };
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
    if (!validateDate(date)) {
      return {
        content: [{
          type: "text",
          text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
        }]
      };
    }
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
    if (!validateUUID(technicianId)) {
      return {
        content: [{
          type: "text",
          text: "❌ ID tecnico non valido."
        }]
      };
    }
    
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
    updateData.notes = notes ? sanitizeHtml(notes) : null;
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
}

async function cancelBooking(args: any, auth: any) {
  const { bookingId, reason } = args;
  
  if (!validateUUID(bookingId)) {
    return {
      content: [{
        type: "text",
        text: "❌ ID prenotazione non valido."
      }]
    };
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
      notes: reason ? `${booking.notes || ''}\n\nMotivo cancellazione: ${sanitizeHtml(reason)}` : booking.notes
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
}

async function getBookings(args: any, auth: any) {
  const { date, from, to, status, technicianId } = args;

  // Validate inputs
  if (date && !validateDate(date)) {
    return {
      content: [{
        type: "text",
        text: "❌ Data non valida. Usa il formato YYYY-MM-DD."
      }]
    };
  }
  
  if (from && !validateDate(from)) {
    return {
      content: [{
        type: "text",
        text: "❌ Data 'from' non valida. Usa il formato YYYY-MM-DD."
      }]
    };
  }
  
  if (to && !validateDate(to)) {
    return {
      content: [{
        type: "text",
        text: "❌ Data 'to' non valida. Usa il formato YYYY-MM-DD."
      }]
    };
  }

  if (technicianId && !validateUUID(technicianId)) {
    return {
      content: [{
        type: "text",
        text: "❌ ID tecnico non valido."
      }]
    };
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
  bookings.forEach((booking: any, index: number) => {
    result += `${index + 1}. ${formatBookingInfo(booking)}\n---\n\n`;
  });

  return {
    content: [{
      type: "text",
      text: result
    }]
  };
}