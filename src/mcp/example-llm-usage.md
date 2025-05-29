# MCP Server Usage Examples for LLMs

This document shows how LLMs can interact with the Virtus Booking MCP server.

## Example 1: Checking Availability

**Human**: "Can you check if there are any technicians available tomorrow for a water filter installation?"

**LLM Response**:
```
I'll check the technician availability for tomorrow.

[Calls check_availability tool with date: "2025-01-16"]

Based on the availability check for January 16, 2025:

**Morning (10:00-12:00)**:
- Marco Rossi: ✅ Available
- Luigi Bianchi: ❌ Busy
- Anna Verdi: ✅ Available

**Afternoon (13:00-15:00)**:
- Marco Rossi: ✅ Available
- Luigi Bianchi: ✅ Available
- Anna Verdi: ❌ Busy

**Evening (16:00-18:00)**:
- Marco Rossi: ❌ Busy
- Luigi Bianchi: ✅ Available
- Anna Verdi: ✅ Available

There are multiple technicians available tomorrow. Which time slot would work best for you?
```

## Example 2: Creating a Booking

**Human**: "I'd like to book Marco Rossi for tomorrow morning. My name is Giuseppe Conte, phone 333-1234567, and I live at Via Roma 123, Milano. I need a under-sink filter installation."

**LLM Response**:
```
I'll create the booking for you with Marco Rossi tomorrow morning.

[Calls create_booking tool with:
- date: "2025-01-16"
- slot: "MORNING"
- technicianId: "tech-001"
- customer: {
    name: "Giuseppe Conte",
    phone: "333-1234567",
    address: "Via Roma 123, Milano"
  }
- installationType: "Filtro sotto lavello"
]

✅ **Booking created successfully!**

**Booking ID: booking-12345**
- **Date**: 16 gennaio 2025
- **Time**: Mattina (10:00-12:00)
- **Customer**: Giuseppe Conte
- **Phone**: 333-1234567
- **Address**: Via Roma 123, Milano
- **Technician**: Marco Rossi
- **Installation Type**: Filtro sotto lavello
- **Status**: SCHEDULED

The technician will arrive between 10:00 and 12:00. Please make sure someone is home to let them in.
```

## Example 3: Modifying a Booking

**Human**: "I need to reschedule booking-12345 to the afternoon instead"

**LLM Response**:
```
I'll reschedule your appointment to the afternoon slot.

[Calls modify_booking tool with:
- bookingId: "booking-12345"
- slot: "AFTERNOON"
]

✅ **Booking modified successfully!**

Your appointment has been rescheduled:
- **New Time**: Pomeriggio (13:00-15:00)
- Same date (16 gennaio 2025)
- Same technician (Marco Rossi)

All other details remain the same.
```

## Example 4: Complex Booking Workflow

**Human**: "I need to book a water filter installation for next week. Can you help me find the best time?"

**LLM Response**:
```
I'll help you find the best time for your water filter installation next week. Let me check the availability.

[Calls check_availability for each day of next week]

Here's the availability summary for next week:

**Monday, January 20**:
- Morning: 2 technicians available
- Afternoon: 3 technicians available ✅ (Best availability)
- Evening: 1 technician available

**Tuesday, January 21**:
- Morning: 1 technician available
- Afternoon: 2 technicians available
- Evening: 3 technicians available ✅ (Best availability)

**Wednesday, January 22**:
- Morning: 3 technicians available ✅ (Best availability)
- Afternoon: 2 technicians available
- Evening: No availability

Based on the availability, the best times are:
1. Monday afternoon (3 technicians)
2. Tuesday evening (3 technicians)
3. Wednesday morning (3 technicians)

Which day and time would you prefer? I'll also need:
- Your name and phone number
- Installation address
- Type of filter installation needed
```

## Example 5: Real-time Updates via SSE

When connected via SSE, the LLM receives real-time updates:

```javascript
// SSE Connection established
{
  "type": "connection-established",
  "sessionId": "abc-123",
  "timestamp": "2025-01-15T10:00:00Z"
}

// Real-time booking notification
{
  "type": "booking-notification",
  "event": "created",
  "booking": {
    "id": "booking-67890",
    "customer": "Maria Bianchi",
    "date": "2025-01-20",
    "slot": "MORNING",
    "technician": "Luigi Bianchi"
  },
  "timestamp": "2025-01-15T10:05:00Z"
}

// Availability update
{
  "type": "availability-update",
  "date": "2025-01-20",
  "technicianId": "tech-002",
  "timestamp": "2025-01-15T10:05:01Z"
}
```

## Integration Tips for LLMs

1. **Always check availability before booking** to ensure the slot is still free
2. **Use Italian language** in all customer-facing responses
3. **Format dates** in Italian style (d MMMM yyyy)
4. **Validate phone numbers** - Italian format expected
5. **Handle errors gracefully** - slots may become unavailable between check and booking
6. **Subscribe to real-time updates** for the best user experience
7. **Batch availability checks** when looking at multiple days

## Error Handling Examples

**Slot Already Booked**:
```
Mi dispiace, ma la fascia oraria richiesta è già stata prenotata. 
Posso suggerirle un altro orario disponibile?
```

**Technician Not Available**:
```
Il tecnico richiesto non è disponibile in questa data. 
Ci sono altri tecnici disponibili che posso proporle.
```

**Past Date Booking**:
```
Non è possibile prenotare appuntamenti per date passate. 
Quale data futura preferisce?
```