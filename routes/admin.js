const express = require("express");
const { supabase } = require("../utils/supabase");
const { requireAdminAuth } = require("../middleware/require-admin-auth");
const router = express.Router();
const { validateBody } = require("../validators/common");
const {
  hotelSchema,
  menuItemSchema,
  hotelProfileSchema
} = require("../validators/admin");
router.use(requireAdminAuth);
/* ─────────────────────────────────────────────
   GET /api/admin/orders
   Optional query: ?hotelName=Hotel Sai Raj
   ───────────────────────────────────────────── */
router.get("/orders", async (req, res) => {
  try {
    const { hotelName } = req.query;

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (hotelName) {
      query = query.eq("hotel_name", hotelName);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      orders: data
    });
  } catch (error) {
    console.error("Admin orders fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
});

/* ─────────────────────────────────────────────
   GET /api/admin/inquiries
   Optional query: ?hotelName=Hotel Sai Raj
   ───────────────────────────────────────────── */
router.get("/inquiries", async (req, res) => {
  try {
    const { hotelName } = req.query;

    let query = supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (hotelName) {
      query = query.eq("hotel_name", hotelName);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      inquiries: data
    });
  } catch (error) {
    console.error("Admin inquiries fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inquiries"
    });
  }
});

/* ─────────────────────────────────────────────
   GET /api/admin/reservations
   Optional query: ?hotelName=Hotel Sai Raj
   ───────────────────────────────────────────── */
router.get("/reservations", async (req, res) => {
  try {
    const { hotelName } = req.query;

    let query = supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });

    if (hotelName) {
      query = query.eq("hotel_name", hotelName);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      reservations: data
    });
  } catch (error) {
    console.error("Admin reservations fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reservations"
    });
  }
});


router.get("/hotels", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("hotels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      hotels: data
    });
  } catch (error) {
    console.error("Admin hotels fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch hotels"
    });
  }
});


router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Order status updated",
      order: data
    });
  } catch (error) {
    console.error("Order status update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
});

router.patch("/inquiries/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const { data, error } = await supabase
      .from("inquiries")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Inquiry status updated",
      inquiry: data
    });
  } catch (error) {
    console.error("Inquiry status update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update inquiry status"
    });
  }
});

router.patch("/reservations/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const { data, error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Reservation status updated",
      reservation: data
    });
  } catch (error) {
    console.error("Reservation status update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update reservation status"
    });
  }
});

router.patch("/hotels/:id/domain", async (req, res) => {
  try {
    const { id } = req.params;
    const { primaryDomain, subdomain, isActive } = req.body;

    const updatePayload = {};

    if (primaryDomain !== undefined) {
      updatePayload.primary_domain = primaryDomain || null;
    }

    if (subdomain !== undefined) {
      updatePayload.subdomain = subdomain || null;
    }

    if (isActive !== undefined) {
      updatePayload.is_active = !!isActive;
    }

    const { data, error } = await supabase
      .from("hotels")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Hotel domain settings updated",
      hotel: data
    });
  } catch (error) {
    console.error("Hotel domain update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hotel domain settings"
    });
  }
});

router.post("/hotels", validateBody(hotelSchema), async (req, res) => {
  try {
    const {
      slug,
      name,
      whatsappNumber,
      upiId,
      gstPercent,
      primaryDomain,
      subdomain,
      isActive
    } = req.validatedBody;

    const { data, error } = await supabase
      .from("hotels")
      .insert([
        {
          slug,
          name,
          whatsapp_number: whatsappNumber || null,
          upi_id: upiId || null,
          gst_percent: gstPercent ?? 5,
          primary_domain: primaryDomain || null,
          subdomain: subdomain || null,
          is_active: isActive !== undefined ? !!isActive : true
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      hotel: data
    });
  } catch (error) {
    console.error("Hotel create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create hotel"
    });
  }
});

router.patch("/hotels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slug,
      name,
      whatsappNumber,
      upiId,
      gstPercent,
      primaryDomain,
      subdomain,
      isActive
    } = req.body;

    const updatePayload = {};

    if (slug !== undefined) updatePayload.slug = slug;
    if (name !== undefined) updatePayload.name = name;
    if (whatsappNumber !== undefined) updatePayload.whatsapp_number = whatsappNumber || null;
    if (upiId !== undefined) updatePayload.upi_id = upiId || null;
    if (gstPercent !== undefined) updatePayload.gst_percent = gstPercent;
    if (primaryDomain !== undefined) updatePayload.primary_domain = primaryDomain || null;
    if (subdomain !== undefined) updatePayload.subdomain = subdomain || null;
    if (isActive !== undefined) updatePayload.is_active = !!isActive;

    const { data, error } = await supabase
      .from("hotels")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Hotel updated successfully",
      hotel: data
    });
  } catch (error) {
    console.error("Hotel update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hotel"
    });
  }
});

router.post("/hotel-profiles", validateBody(hotelProfileSchema), async (req, res) => {
  try {
    const {
      hotelSlug,
      hotelName,
      tagline,
      ownerWhatsAppNumber,
      ownerUpiId,
      gstPercent,
      contact,
      branding,
      hero,
      about,
      features,
      events,
      reservation,
      contactSection,
      location,
      footer,
      social
    } = req.validatedBody;

    const { data, error } = await supabase
      .from("hotel_profiles")
      .upsert(
        [
          {
            hotel_slug: hotelSlug,
            hotel_name: hotelName,
            tagline: tagline || "",
            owner_whatsapp_number: ownerWhatsAppNumber || "",
            owner_upi_id: ownerUpiId || "",
            gst_percent: gstPercent ?? 5,
            contact: contact || {},
            branding: branding || {},
            hero: hero || {},
            about: about || {},
            features: features || [],
            events: events || {},
            reservation: reservation || {},
            contact_section: contactSection || {},
            location: location || {},
            footer: footer || {},
            social: social || {},
            updated_at: new Date().toISOString()
          }
        ],
        { onConflict: "hotel_slug" }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Hotel profile saved successfully",
      profile: data
    });
  } catch (error) {
    console.error("Hotel profile save error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save hotel profile"
    });
  }
});

router.get("/hotel-profiles/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from("hotel_profiles")
      .select("*")
      .eq("hotel_slug", slug)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Hotel profile not found"
      });
    }

    res.json({
      success: true,
      profile: data
    });
  } catch (error) {
    console.error("Hotel profile fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch hotel profile"
    });
  }
});

router.get("/menu-items", async (req, res) => {
  try {
    const { hotelSlug } = req.query;

    let query = supabase
      .from("menu_items")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (hotelSlug) {
      query = query.eq("hotel_slug", hotelSlug);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      menuItems: data
    });
  } catch (error) {
    console.error("Menu items fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu items"
    });
  }
});

router.post("/menu-items", validateBody(menuItemSchema), async (req, res) => {
  try {
    const {
      hotelSlug,
      category,
      itemId,
      name,
      description,
      price,
      image,
      alt,
      badge,
      tag,
      isAvailable,
      sortOrder
    } = req.validatedBody;

    const { data, error } = await supabase
      .from("menu_items")
      .insert([
        {
          hotel_slug: hotelSlug,
          category,
          item_id: itemId,
          name,
          description: description || "",
          price: Number(price || 0),
          image: image || "",
          alt: alt || "",
          badge: badge || "",
          tag: tag || "",
          is_available: isAvailable !== undefined ? !!isAvailable : true,
          sort_order: Number(sortOrder || 0)
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      menuItem: data
    });
  } catch (error) {
    console.error("Menu item create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create menu item"
    });
  }
});

router.patch("/menu-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      itemId,
      name,
      description,
      price,
      image,
      alt,
      badge,
      tag,
      isAvailable,
      sortOrder
    } = req.body;

    const updatePayload = {};

    if (category !== undefined) updatePayload.category = category;
    if (itemId !== undefined) updatePayload.item_id = itemId;
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (price !== undefined) updatePayload.price = Number(price);
    if (image !== undefined) updatePayload.image = image;
    if (alt !== undefined) updatePayload.alt = alt;
    if (badge !== undefined) updatePayload.badge = badge;
    if (tag !== undefined) updatePayload.tag = tag;
    if (isAvailable !== undefined) updatePayload.is_available = !!isAvailable;
    if (sortOrder !== undefined) updatePayload.sort_order = Number(sortOrder);

    const { data, error } = await supabase
      .from("menu_items")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Menu item updated successfully",
      menuItem: data
    });
  } catch (error) {
    console.error("Menu item update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update menu item"
    });
  }
});

router.patch("/menu-items/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived } = req.body;

    const { data, error } = await supabase
      .from("menu_items")
      .update({
        is_archived: !!isArchived,
        is_available: !!isArchived ? false : true
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: isArchived ? "Menu item archived" : "Menu item restored",
      menuItem: data
    });
  } catch (error) {
    console.error("Menu item archive error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive menu item"
    });
  }
});

router.delete("/menu-items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Menu item deleted successfully"
    });
  } catch (error) {
    console.error("Menu item delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete menu item"
    });
  }
});

router.patch("/hotels/:id/active", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const { data, error } = await supabase
      .from("hotels")
      .update({
        is_active: !!isActive
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: isActive ? "Hotel activated" : "Hotel deactivated",
      hotel: data
    });
  } catch (error) {
    console.error("Hotel active toggle error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hotel active state"
    });
  }
});

module.exports = router;