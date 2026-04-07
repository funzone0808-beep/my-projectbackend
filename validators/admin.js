const { z } = require("zod");

const hotelSchema = z.object({
  slug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(150),
  whatsappNumber: z.string().trim().max(30).optional().nullable(),
  upiId: z.string().trim().max(120).optional().nullable(),
  gstPercent: z.number().min(0).max(100).optional(),
  primaryDomain: z.string().trim().max(255).optional().nullable(),
  subdomain: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().optional()
});

const menuItemSchema = z.object({
  hotelSlug: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(50),
  itemId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(150),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().nonnegative(),
  image: z.string().trim().max(2000).optional().nullable(),
  alt: z.string().trim().max(300).optional().nullable(),
  badge: z.string().trim().max(100).optional().nullable(),
  tag: z.string().trim().max(100).optional().nullable(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional()
});

const hotelProfileSchema = z.object({
  hotelSlug: z.string().trim().min(2).max(120),
  hotelName: z.string().trim().min(2).max(150),
  tagline: z.string().max(500).optional().nullable(),
  ownerWhatsAppNumber: z.string().trim().max(30).optional().nullable(),
  ownerUpiId: z.string().trim().max(120).optional().nullable(),
  gstPercent: z.number().min(0).max(100).optional(),
  contact: z.record(z.any()).optional(),
  branding: z.record(z.any()).optional(),
  hero: z.record(z.any()).optional(),
  about: z.record(z.any()).optional(),
  features: z.array(z.any()).optional(),
  events: z.record(z.any()).optional(),
  reservation: z.record(z.any()).optional(),
  contactSection: z.record(z.any()).optional(),
  location: z.record(z.any()).optional(),
  footer: z.record(z.any()).optional(),
  social: z.record(z.any()).optional()
});

const partialHotelSchema = hotelSchema.partial();
const partialMenuItemSchema = menuItemSchema.partial();


module.exports = {
  hotelSchema,
  partialHotelSchema,
  menuItemSchema,
  partialMenuItemSchema,
  hotelProfileSchema
};