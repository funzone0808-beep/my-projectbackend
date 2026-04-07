const { z } = require("zod");

const orderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().nonnegative()
});

const orderSchema = z.object({
  hotelName: z.string().trim().min(1),
  hotelSlug: z.string().trim().min(1).optional().nullable(),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(8).max(20),
  customerAddress: z.string().trim().min(3).max(500),
  paymentMethod: z.string().trim().min(1).max(30).optional(),
  note: z.string().max(1000).optional(),
  paymentConfirmed: z.boolean().optional(),
  items: z.array(orderItemSchema).min(1),
  totals: z.object({
    subtotal: z.number().nonnegative().optional(),
    gst: z.number().nonnegative().optional(),
    total: z.number().nonnegative().optional(),
    normalTotal: z.number().nonnegative().optional(),
    gpayDiscount: z.number().nonnegative().optional(),
    gpayFinalTotal: z.number().nonnegative().optional()
  }).optional(),
  whatsappMessage: z.string().max(5000).optional()
});

const inquirySchema = z.object({
  hotelName: z.string().trim().min(1),
  hotelSlug: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20),
  eventType: z.string().trim().min(2).max(100),
  date: z.string().trim().min(1).max(50),
  guests: z.union([z.string(), z.number()]).optional(),
  specialRequirements: z.string().max(2000).optional()
});

const reservationSchema = z.object({
  hotelName: z.string().trim().min(1),
  hotelSlug: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20),
  date: z.string().trim().min(1).max(50),
  time: z.string().trim().min(1).max(50),
  guests: z.union([z.string(), z.number()]),
  note: z.string().max(1000).optional()
});

module.exports = {
  orderSchema,
  inquirySchema,
  reservationSchema
};