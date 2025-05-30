import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// UUID validation schema
export const UUIDSchema = z.string().uuid();

// Date validation schema
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Customer validation schema
export const CustomerSchema = z.object({
  name: z.string()
    .min(2, "Il nome deve avere almeno 2 caratteri")
    .max(100, "Il nome non può superare i 100 caratteri")
    .regex(/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/, "Il nome contiene caratteri non validi"),
  phone: z.string()
    .regex(/^(\+39\s?)?((3[0-9]{2})\s?(\d{3}\s?\d{4}|\d{7})|0\d{1,4}\s?\d{6,9})$/, 
      "Numero di telefono non valido"),
  email: z.string().email("Email non valida").optional().or(z.literal('')),
  address: z.string()
    .min(5, "L'indirizzo deve avere almeno 5 caratteri")
    .max(500, "L'indirizzo non può superare i 500 caratteri")
    .regex(/^[a-zA-Z0-9àèéìòùÀÈÉÌÒÙ\s,.'/-]+$/, "L'indirizzo contiene caratteri non validi")
});

// Installation type enum
export const InstallationTypeSchema = z.enum([
  'INSTALLATION',
  'MAINTENANCE',
  'REPAIR',
  'INSPECTION'
]);

// Time slot enum
export const TimeSlotSchema = z.enum(['MORNING', 'AFTERNOON', 'EVENING']);

// Booking validation schema
export const BookingSchema = z.object({
  date: DateSchema,
  slot: TimeSlotSchema,
  technicianId: UUIDSchema,
  customer: CustomerSchema,
  installationType: InstallationTypeSchema,
  notes: z.string().max(1000).optional()
});

// Validate and sanitize input
export function validateUUID(id: string): string | null {
  try {
    return UUIDSchema.parse(id);
  } catch {
    return null;
  }
}

export function validateDate(date: string): string | null {
  try {
    return DateSchema.parse(date);
  } catch {
    return null;
  }
}

// HTML sanitization using DOMPurify
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}