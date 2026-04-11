const express = require("express");
const { supabase } = require("../utils/supabase");
const { validateBody } = require("../validators/common");
const { testimonialSubmissionSchema } = require("../validators/public");

const router = express.Router();

function isMissingTestimonialsRelationError(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  const details = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`
    .trim()
    .toLowerCase();

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (details.includes("testimonial") &&
      (details.includes("relation") ||
        details.includes("schema cache") ||
        details.includes("could not find")))
  );
}

router.post("/", validateBody(testimonialSubmissionSchema), async (req, res) => {
  try {
    const { hotelName, hotelSlug, name, role, text, stars } = req.validatedBody;

    const { data, error } = await supabase
      .from("testimonials")
      .insert([
        {
          hotel_slug: hotelSlug,
          guest_name: name,
          guest_role: role || "",
          review_text: text,
          star_rating: Number(stars),
          avatar_url: "",
          sort_order: 0,
          is_active: true,
          is_archived: false,
          is_approved: false,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      if (isMissingTestimonialsRelationError(error)) {
        return res.status(503).json({
          success: false,
          message: "Reviews are temporarily unavailable"
        });
      }

      throw error;
    }

    res.status(201).json({
      success: true,
      message: "Review submitted successfully. It will appear after approval.",
      testimonial: {
        id: data.id,
        hotelName,
        hotelSlug,
        name,
        role: role || "",
        text,
        stars: Number(stars),
        isApproved: false
      }
    });
  } catch (error) {
    console.error("Testimonial submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit review"
    });
  }
});

module.exports = router;
