const { z } = require("zod");

const jsonRecordSchema = z.record(z.string(), z.any());
const shortCssValueSchema = z.string().trim().max(80);
const presetThemeValueSchema = z.string().trim().max(50);
const themeSectionIdSchema = z.enum([
  "about",
  "menu",
  "reservation",
  "events",
  "gallery",
  "testimonials",
  "contact"
]);

const hotelThemeSchema = z
  .object({
    colors: z
      .object({
        primary: shortCssValueSchema.optional(),
        primaryLight: shortCssValueSchema.optional(),
        primaryDark: shortCssValueSchema.optional(),
        background: shortCssValueSchema.optional(),
        backgroundAlt: shortCssValueSchema.optional(),
        text: shortCssValueSchema.optional(),
        textMuted: shortCssValueSchema.optional()
      })
      .passthrough()
      .optional(),
    radius: z
      .object({
        base: shortCssValueSchema.optional(),
        small: shortCssValueSchema.optional()
      })
      .passthrough()
      .optional(),
    typography: z
      .object({
        preset: z.enum(["default", "system"]).optional()
      })
      .passthrough()
      .optional(),
    hero: z
      .object({
        layoutVariant: z.enum(["default", "split", "stacked"]).optional()
      })
      .passthrough()
      .optional(),
    layout: z
      .object({
        containerPreset: z.enum(["compact", "default", "wide"]).optional()
      })
      .passthrough()
      .optional(),
    buttons: z
      .object({
        preset: z.enum(["default", "solid", "crisp"]).optional()
      })
      .passthrough()
      .optional(),
    sections: z
      .object({
        about: z.boolean().optional(),
        events: z.boolean().optional(),
        gallery: z.boolean().optional(),
        order: z.array(themeSectionIdSchema).max(7).optional(),
        reservation: z.boolean().optional(),
        testimonials: z.boolean().optional()
      })
      .passthrough()
      .optional(),
    meta: z
      .object({
        version: presetThemeValueSchema.optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

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

const galleryLayoutVariantSchema = z.enum(["standard", "large", "tall", "wide"]);

const galleryItemSchema = z.object({
  hotelSlug: z.string().trim().min(2).max(120),
  imageUrl: z.string().trim().min(1).max(2000),
  storagePath: z.string().trim().max(500).optional().nullable(),
  alt: z.string().trim().max(300).optional().nullable(),
  layoutVariant: galleryLayoutVariantSchema.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional()
});

const testimonialSchema = z.object({
  hotelSlug: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(150),
  role: z.string().trim().max(150).optional().nullable(),
  text: z.string().trim().min(2).max(4000),
  stars: z.number().int().min(1).max(5).optional(),
  avatar: z.string().trim().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional()
});

const notificationOwnerEmailSchema = z
  .union([z.string().trim().email().max(320), z.literal(""), z.null()])
  .optional();

const hotelNotificationSettingsSchema = z.object({
  hotelSlug: z.string().trim().min(2).max(120),
  emailEnabled: z.boolean().optional(),
  ownerEmail: notificationOwnerEmailSchema,
  notifyOnNewOrder: z.boolean().optional(),
  notifyOnNewReservation: z.boolean().optional(),
  notifyOnNewInquiry: z.boolean().optional()
});

const hotelProfileSchema = z.object({
  hotelSlug: z.string().trim().min(2).max(120),
  hotelName: z.string().trim().min(2).max(150),
  tagline: z.string().max(500).optional().nullable(),
  ownerWhatsAppNumber: z.string().trim().max(30).optional().nullable(),
  ownerUpiId: z.string().trim().max(120).optional().nullable(),
  gstPercent: z.number().min(0).max(100).optional(),
  contact: jsonRecordSchema.optional(),
  branding: jsonRecordSchema.optional(),
  theme: hotelThemeSchema.optional(),
  hero: jsonRecordSchema.optional(),
  about: jsonRecordSchema.optional(),
  features: z.array(z.any()).optional(),
  events: jsonRecordSchema.optional(),
  reservation: jsonRecordSchema.optional(),
  contactSection: jsonRecordSchema.optional(),
  location: jsonRecordSchema.optional(),
  footer: jsonRecordSchema.optional(),
  social: jsonRecordSchema.optional()
});

const partialHotelSchema = hotelSchema.partial();
const partialMenuItemSchema = menuItemSchema.partial();
const partialGalleryItemSchema = galleryItemSchema.partial();
const partialTestimonialSchema = testimonialSchema.partial();


module.exports = {
  hotelSchema,
  partialHotelSchema,
  galleryItemSchema,
  partialGalleryItemSchema,
  hotelNotificationSettingsSchema,
  menuItemSchema,
  partialMenuItemSchema,
  hotelProfileSchema,
  testimonialSchema,
  partialTestimonialSchema
};
