const express = require("express");
const { supabase } = require("../utils/supabase");
const { createNotificationEventSafely } = require("../utils/notifications");

// ✅ Added imports
const { validateBody } = require("../validators/common");
const { reservationSchema } = require("../validators/public");

const router = express.Router();

// ✅ Middleware added
router.post("/", validateBody(reservationSchema), async (req, res) => {
  try {
    // ✅ Use validatedBody
    const {
      hotelName,
      hotelSlug,
      name,
      phone,
      date,
      time,
      guests,
      note
    } = req.validatedBody;

    // (Optional: manual validation can be removed since schema handles it)

    const { data, error } = await supabase
      .from("reservations")
      .insert([
        {
          hotel_name: hotelName || "Unknown Hotel",
          hotel_slug: hotelSlug || null,
          name,
          phone,
          date,
          time,
          guests,
          note: note || "",
          status: "new"
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    void createNotificationEventSafely({
      hotelSlug: data.hotel_slug || hotelSlug || null,
      sourceType: "reservation",
      sourceId: data.id,
      payload: {
        reservationId: data.id,
        hotelName: data.hotel_name || hotelName || "",
        name: data.name || name,
        phone: data.phone || phone,
        date: data.date || date,
        time: data.time || time,
        guests: data.guests || guests,
        note: data.note || note || "",
        status: data.status || "new"
      }
    });

    res.status(201).json({
      success: true,
      message: "Reservation saved successfully",
      reservation: data
    });
  } catch (error) {
    console.error("Reservation save error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save reservation"
    });
  }
});

module.exports = router;
