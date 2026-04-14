const express = require("express");
const { supabase } = require("../utils/supabase");
const { createNotificationEventSafely } = require("../utils/notifications");

// ✅ Added imports
const { validateBody } = require("../validators/common");
const { orderSchema } = require("../validators/public");

const router = express.Router();

function normalizeOptionalText(value, maxLength = 80) {
  const text = typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim()
    : "";
  return text.slice(0, maxLength);
}

function cleanPhone(value = "") {
  return String(value || "").replace(/\D/g, "");
}

async function getOwnerWhatsAppNumber(hotelSlug) {
  const normalizedHotelSlug = normalizeOptionalText(hotelSlug, 120);
  if (!normalizedHotelSlug) {
    return cleanPhone(process.env.OWNER_WHATSAPP_NUMBER || "");
  }

  try {
    const { data, error } = await supabase
      .from("hotel_profiles")
      .select("owner_whatsapp_number")
      .eq("hotel_slug", normalizedHotelSlug)
      .maybeSingle();

    if (error) {
      console.warn("Hotel owner WhatsApp lookup failed:", error.message);
    }

    const profileWhatsAppNumber = cleanPhone(data?.owner_whatsapp_number || "");
    if (profileWhatsAppNumber) {
      return profileWhatsAppNumber;
    }
  } catch (error) {
    console.warn("Hotel owner WhatsApp lookup failed:", error.message);
  }

  try {
    const { data, error } = await supabase
      .from("hotels")
      .select("whatsapp_number")
      .eq("slug", normalizedHotelSlug)
      .maybeSingle();

    if (error) {
      console.warn("Hotel WhatsApp lookup failed:", error.message);
    }

    const hotelWhatsAppNumber = cleanPhone(data?.whatsapp_number || "");
    if (hotelWhatsAppNumber) {
      return hotelWhatsAppNumber;
    }
  } catch (error) {
    console.warn("Hotel WhatsApp lookup failed:", error.message);
  }

  return cleanPhone(process.env.OWNER_WHATSAPP_NUMBER || "");
}

function getNormalizedOrderContext(orderContext) {
  if (!orderContext || typeof orderContext !== "object" || Array.isArray(orderContext)) {
    return null;
  }

  const orderType = normalizeOptionalText(orderContext.orderType, 40);
  const tableNumber = normalizeOptionalText(orderContext.tableNumber, 80);
  const orderSource = normalizeOptionalText(orderContext.orderSource, 40);

  if (!orderType && !tableNumber && !orderSource) {
    return null;
  }

  return {
    orderType: orderType || null,
    tableNumber: tableNumber || null,
    orderSource: orderSource || null
  };
}

function getOrderContextColumns(orderContext) {
  const normalizedOrderContext = getNormalizedOrderContext(orderContext);

  if (!normalizedOrderContext) {
    return {};
  }

  return {
    order_type: normalizedOrderContext.orderType,
    table_number: normalizedOrderContext.tableNumber,
    order_source: normalizedOrderContext.orderSource
  };
}

function hasDineInTableContext(orderContext) {
  return orderContext?.orderType === "dine-in" && !!orderContext.tableNumber;
}

function getBillingMetadataColumns({ orderContext, paymentMethod, paymentConfirmed }) {
  if (!hasDineInTableContext(orderContext)) {
    return {};
  }

  const normalizedPaymentMethod = normalizeOptionalText(paymentMethod, 60).toLowerCase();
  const isUpiPayment =
    normalizedPaymentMethod.includes("upi") ||
    normalizedPaymentMethod.includes("gpay") ||
    normalizedPaymentMethod.includes("google pay");

  return {
    payment_status: isUpiPayment && paymentConfirmed
      ? "customer_confirmed"
      : "unpaid",
    billing_status: "not_billed"
  };
}

function shouldRetryWithoutOptionalOrderColumns(error, optionalOrderColumns) {
  const optionalColumnNames = Object.keys(optionalOrderColumns);
  if (!optionalColumnNames.length || !error) return false;

  const message = [
    error.code,
    error.message,
    error.details,
    error.hint
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    message.includes("pgrst204") ||
    (
      message.includes("could not find") &&
      optionalColumnNames.some((columnName) => message.includes(columnName.toLowerCase()))
    )
  );
}

async function insertOrderRow(baseOrderRow, optionalOrderColumns = {}) {
  const hasOptionalOrderColumns = Object.keys(optionalOrderColumns).length > 0;
  const firstAttemptRow = hasOptionalOrderColumns
    ? { ...baseOrderRow, ...optionalOrderColumns }
    : baseOrderRow;

  const firstAttempt = await supabase
    .from("orders")
    .insert([firstAttemptRow])
    .select()
    .single();

  if (!firstAttempt.error || !hasOptionalOrderColumns) {
    return firstAttempt;
  }

  if (!shouldRetryWithoutOptionalOrderColumns(firstAttempt.error, optionalOrderColumns)) {
    return firstAttempt;
  }

  console.warn(
    "Optional order columns are not available yet. Retrying order save without structured order metadata columns."
  );

  return supabase
    .from("orders")
    .insert([baseOrderRow])
    .select()
    .single();
}

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
      paymentConfirmed,
      note,
      items,
      totals,
      whatsappMessage,
      orderContext
    } = req.validatedBody;

    // (Optional: You can now remove manual validation since schema handles it)

    // ✅ Insert into Supabase
    const baseOrderRow = {
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
    };
    const safeOrderContext = getNormalizedOrderContext(orderContext);
    const orderContextColumns = getOrderContextColumns(safeOrderContext);
    const billingMetadataColumns = getBillingMetadataColumns({
      orderContext: safeOrderContext,
      paymentMethod,
      paymentConfirmed
    });
    const optionalOrderColumns = {
      ...orderContextColumns,
      ...billingMetadataColumns
    };
    const { data, error } = await insertOrderRow(baseOrderRow, optionalOrderColumns);

    if (error) throw error;

    void createNotificationEventSafely({
      hotelSlug: data.hotel_slug || hotelSlug || null,
      sourceType: "order",
      sourceId: data.id,
      payload: {
        orderId: data.id,
        hotelName: data.hotel_name || hotelName || "",
        customerName: data.customer_name || customerName,
        customerPhone: data.customer_phone || customerPhone,
        customerAddress: data.customer_address || customerAddress || "",
        paymentMethod: data.payment_method || paymentMethod || "COD",
        paymentStatus: data.payment_status || billingMetadataColumns.payment_status || null,
        billingStatus: data.billing_status || billingMetadataColumns.billing_status || null,
        note: data.note || note || "",
        items: Array.isArray(data.items) ? data.items : items || [],
        totals:
          data.totals && typeof data.totals === "object" && !Array.isArray(data.totals)
            ? data.totals
            : totals || {},
        whatsappMessage: data.whatsapp_message || whatsappMessage || "",
        orderContext: safeOrderContext,
        status: data.status || "new"
      }
    });

    // ✅ Generate WhatsApp link
    const ownerWhatsAppNumber = await getOwnerWhatsAppNumber(data.hotel_slug || hotelSlug);
    const ownerWhatsappLink = whatsappMessage && ownerWhatsAppNumber
      ? `https://wa.me/${ownerWhatsAppNumber}?text=${encodeURIComponent(whatsappMessage)}`
      : "";

    // ✅ Final response
    res.status(201).json({
      success: true,
      message: "Order saved successfully",
      order: data,
      preview: whatsappMessage,
      orderContext: safeOrderContext,
      ownerWhatsappLink,
      whatsappLinkReady: !!ownerWhatsappLink
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
