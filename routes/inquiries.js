const express = require("express");
const { supabase } = require("../utils/supabase");

// ✅ Added imports
const { validateBody } = require("../validators/common");
const { inquirySchema } = require("../validators/public");

const router = express.Router();

// ✅ Middleware added
router.post("/", validateBody(inquirySchema), async (req, res) => {
  try {
    // ✅ Use validatedBody
    const {
      hotelName,
      hotelSlug,
      name,
      phone,
      eventType,
      date,
      guests,
      specialRequirements
    } = req.validatedBody;

    // (Optional: manual validation can be removed since schema handles it)

    const { data, error } = await supabase
      .from("inquiries")
      .insert([
        {
          hotel_name: hotelName || "Unknown Hotel",
          hotel_slug: hotelSlug || null,
          name,
          phone,
          event_type: eventType,
          date,
          guests: guests || "",
          special_requirements: specialRequirements || "",
          status: "new"
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: "Inquiry saved successfully",
      inquiry: data
    });
  } catch (error) {
    console.error("Inquiry save error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save inquiry"
    });
  }
});

module.exports = router;