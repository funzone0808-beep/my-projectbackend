const express = require("express");
const { supabase } = require("../utils/supabase");

// ✅ Added imports
const { validateBody } = require("../validators/common");
const { orderSchema } = require("../validators/public");

const router = express.Router();

// ✅ Middleware added here
router.post("/", validateBody(orderSchema), async (req, res) => {
  try {
    // ✅ Switched to validatedBody
    const {
      hotelName,
      hotelSlug,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      note,
      items,
      totals,
      whatsappMessage
    } = req.validatedBody;

    // (Optional: You can now remove manual validation since schema handles it)

    // ✅ Insert into Supabase
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          hotel_name: hotelName || "Unknown Hotel",
          hotel_slug: hotelSlug || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress || "",
          payment_method: paymentMethod || "COD",
          note: note || "",
          items: items || [],
          totals: totals || {},
          whatsapp_message: whatsappMessage || "",
          status: "new"
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // ✅ Generate WhatsApp link
    const ownerWhatsappLink = whatsappMessage
      ? `https://wa.me/${process.env.OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`
      : "";

    // ✅ Final response
    res.status(201).json({
      success: true,
      message: "Order saved successfully",
      order: data,
      preview: whatsappMessage,
      ownerWhatsappLink
    });

  } catch (error) {
    console.error("Order save error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save order"
    });
  }
});

module.exports = router;