import { prisma } from "@/lib/db";
import { TimeSlot, BookingStatus } from "@prisma/client";
import { startOfDay, endOfDay, format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { validateUUID, validateDate, CustomerSchema, sanitizeHtml } from "@/lib/validation";
import { z } from "zod";

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
    throw new Error("Data non valida. Usa il formato YYYY-MM-DD");
  }

  const targetDate = new Date(date);
  const startDate = startOfDay(targetDate);
  const endDate = endOfDay(targetDate);

  // Get all bookings for the date
  const bookings = await prisma.booking.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ['SCHEDULED', 'COMPLETED']
      },
      ...(technicianId && validateUUID(technicianId) ? { technicianId } : {})
    },
    include: {
      technician: {
        include: {
          user: true
        }
      }
    }
  });

  // Get all active technicians
  const technicians = await prisma.technician.findMany({
    where: {
      active: true,
      ...(technicianId && validateUUID(technicianId) ? { id: technicianId } : {})
    },
    include: {
      user: true
    }
  });

  // Build availability matrix
  const availability: Record<string, any[]> = {
    MORNING: [],
    AFTERNOON: [],
    EVENING: []
  };

  technicians.forEach(tech => {
    Object.keys(slotMapping).forEach(slot => {
      const isBooked = bookings.some(b => 
        b.technicianId === tech.id && b.slot === slotMapping[slot]
      );
      
      availability[slot].push({
        technician: {
          id: tech.id,
          name: tech.user.name || tech.user.email,
          color: tech.color
        },
        available: !isBooked
      });
    });
  });

  const dateFormatted = format(targetDate, "d MMMM yyyy", { locale: it });
  let response = `**Disponibilità per ${dateFormatted}**\n\n`;

  Object.entries(availability).forEach(([slot, techs]) => {
    const slotName = slotDisplayMapping[slotMapping[slot]];
    response += `**${slotName}:**\n`;
    techs.forEach(({ technician, available }) => {
      const status = available ? "✅ Disponibile" : "❌ Occupato";
      response += `- ${technician.name}: ${status}\n`;
    });
    response += '\n';
  });

  return {
    content: [{
      type: "text",
      text: response.trim()
    }]
  };
}

async function createBooking(args: any, auth: any) {
  const { date, slot, technicianId, customer, installationType, notes } = args;

  // Validate inputs
  if (!validateDate(date)) {
    throw new Error("Data non valida. Usa il formato YYYY-MM-DD");
  }

  if (!slotMapping[slot]) {
    throw new Error("Fascia oraria non valida. Usa MORNING, AFTERNOON o EVENING");
  }

  if (!validateUUID(technicianId)) {
    throw new Error("ID tecnico non valido");
  }

  // Validate customer data
  const customerValidation = CustomerSchema.safeParse(customer);
  if (!customerValidation.success) {
    throw new Error(`Dati cliente non validi: ${customerValidation.error.message}`);
  }

  // Check if slot is available
  const existingBooking = await prisma.booking.findFirst({
    where: {
      date: new Date(date),
      slot: slotMapping[slot],
      technicianId,
      status: {
        in: ['SCHEDULED', 'COMPLETED']
      }
    }
  });

  if (existingBooking) {
    throw new Error("Questo slot è già prenotato per il tecnico selezionato");
  }

  // Find or create installation type
  let installationTypeRecord = await prisma.installationType.findFirst({
    where: { name: installationType }
  });

  if (!installationTypeRecord) {
    installationTypeRecord = await prisma.installationType.create({
      data: {
        name: installationType,
        description: `Installazione: ${installationType}`,
        duration: 120 // Default 2 hours
      }
    });
  }

  // Create customer
  const newCustomer = await prisma.customer.create({
    data: {
      name: sanitizeHtml(customer.name),
      phone: customer.phone,
      email: customer.email ? customer.email : undefined,
      address: sanitizeHtml(customer.address)
    }
  });

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      date: new Date(date),
      slot: slotMapping[slot],
      status: 'SCHEDULED',
      notes: notes ? sanitizeHtml(notes) : undefined,
      customerId: newCustomer.id,
      technicianId,
      installationTypeId: installationTypeRecord.id,
      createdById: auth.user.id
    },
    include: {
      customer: true,
      technician: {
        include: {
          user: true
        }
      },
      installationType: true
    }
  });

  const dateFormatted = format(booking.date, "d MMMM yyyy", { locale: it });
  const slotName = slotDisplayMapping[booking.slot];

  return {
    content: [{
      type: "text",
      text: `✅ **Prenotazione creata con successo!**

**Prenotazione ID: ${booking.id}**
- **Data**: ${dateFormatted}
- **Orario**: ${slotName}
- **Cliente**: ${booking.customer.name}
- **Telefono**: ${booking.customer.phone}
- **Indirizzo**: ${booking.customer.address}
- **Tecnico**: ${booking.technician.user.name || booking.technician.user.email}
- **Tipo**: ${booking.installationType.name}
${booking.notes ? `- **Note**: ${booking.notes}` : ''}`
    }]
  };
}

async function modifyBooking(args: any, auth: any) {
  const { bookingId, date, slot, technicianId, notes } = args;

  if (!validateUUID(bookingId)) {
    throw new Error("ID prenotazione non valido");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      technician: {
        include: {
          user: true
        }
      },
      installationType: true
    }
  });

  if (!booking) {
    throw new Error("Prenotazione non trovata");
  }

  if (booking.status === 'CANCELLED') {
    throw new Error("Non è possibile modificare una prenotazione cancellata");
  }

  const updateData: any = {};

  if (date && validateDate(date)) {
    updateData.date = new Date(date);
  }

  if (slot && slotMapping[slot]) {
    updateData.slot = slotMapping[slot];
  }

  if (technicianId && validateUUID(technicianId)) {
    updateData.technicianId = technicianId;
  }

  if (notes !== undefined) {
    updateData.notes = notes ? sanitizeHtml(notes) : null;
  }

  // Check if new slot is available
  if (updateData.date || updateData.slot || updateData.technicianId) {
    const checkDate = updateData.date || booking.date;
    const checkSlot = updateData.slot || booking.slot;
    const checkTechnicianId = updateData.technicianId || booking.technicianId;

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        id: { not: bookingId },
        date: checkDate,
        slot: checkSlot,
        technicianId: checkTechnicianId,
        status: {
          in: ['SCHEDULED', 'COMPLETED']
        }
      }
    });

    if (conflictingBooking) {
      throw new Error("Lo slot selezionato non è disponibile");
    }
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: updateData,
    include: {
      customer: true,
      technician: {
        include: {
          user: true
        }
      },
      installationType: true
    }
  });

  const dateFormatted = format(updatedBooking.date, "d MMMM yyyy", { locale: it });
  const slotName = slotDisplayMapping[updatedBooking.slot];

  return {
    content: [{
      type: "text",
      text: `✅ **Prenotazione modificata con successo!**

**Prenotazione ID: ${updatedBooking.id}**
- **Data**: ${dateFormatted}
- **Orario**: ${slotName}
- **Cliente**: ${updatedBooking.customer.name}
- **Tecnico**: ${updatedBooking.technician.user.name || updatedBooking.technician.user.email}
- **Tipo**: ${updatedBooking.installationType.name}
${updatedBooking.notes ? `- **Note**: ${updatedBooking.notes}` : ''}`
    }]
  };
}

async function cancelBooking(args: any, auth: any) {
  const { bookingId, reason } = args;

  if (!validateUUID(bookingId)) {
    throw new Error("ID prenotazione non valido");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true
    }
  });

  if (!booking) {
    throw new Error("Prenotazione non trovata");
  }

  if (booking.status === 'CANCELLED') {
    throw new Error("Questa prenotazione è già stata cancellata");
  }

  const cancelNotes = reason ? 
    `${booking.notes ? booking.notes + '\n' : ''}CANCELLATA: ${sanitizeHtml(reason)}` : 
    booking.notes;

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      notes: cancelNotes
    }
  });

  return {
    content: [{
      type: "text",
      text: `✅ **Prenotazione cancellata con successo**

**ID Prenotazione**: ${booking.id}
**Cliente**: ${booking.customer.name}
${reason ? `**Motivo**: ${reason}` : ''}`
    }]
  };
}

async function getBookings(args: any, auth: any) {
  const { date, from, to, status, technicianId } = args;

  const whereClause: any = {};

  if (date && validateDate(date)) {
    const targetDate = new Date(date);
    whereClause.date = {
      gte: startOfDay(targetDate),
      lte: endOfDay(targetDate)
    };
  } else if (from || to) {
    whereClause.date = {};
    if (from && validateDate(from)) {
      whereClause.date.gte = startOfDay(new Date(from));
    }
    if (to && validateDate(to)) {
      whereClause.date.lte = endOfDay(new Date(to));
    }
  }

  if (status && ['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(status)) {
    whereClause.status = status;
  }

  if (technicianId && validateUUID(technicianId)) {
    whereClause.technicianId = technicianId;
  }

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    include: {
      customer: true,
      technician: {
        include: {
          user: true
        }
      },
      installationType: true
    },
    orderBy: {
      date: 'asc'
    }
  });

  if (bookings.length === 0) {
    return {
      content: [{
        type: "text",
        text: "Nessuna prenotazione trovata con i criteri specificati."
      }]
    };
  }

  let response = `**Trovate ${bookings.length} prenotazioni**\n\n`;

  bookings.forEach(booking => {
    const dateFormatted = format(booking.date, "d MMMM yyyy", { locale: it });
    const slotName = slotDisplayMapping[booking.slot];
    const statusEmoji = {
      SCHEDULED: "📅",
      COMPLETED: "✅",
      CANCELLED: "❌"
    }[booking.status];

    response += `${statusEmoji} **${dateFormatted} - ${slotName}**
- ID: ${booking.id}
- Cliente: ${booking.customer.name} (${booking.customer.phone})
- Tecnico: ${booking.technician.user.name || booking.technician.user.email}
- Tipo: ${booking.installationType.name}
- Stato: ${booking.status}
${booking.notes ? `- Note: ${booking.notes}` : ''}

`;
  });

  return {
    content: [{
      type: "text",
      text: response.trim()
    }]
  };
}