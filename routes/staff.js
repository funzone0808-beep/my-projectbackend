const express = require("express");
const bcrypt = require("bcryptjs");
const { supabase } = require("../utils/supabase");
const { signStaffToken } = require("../utils/auth");
const { requireStaffAuth } = require("../middleware/require-staff-auth");
const { validateBody } = require("../validators/common");
const { staffLoginSchema } = require("../validators/staff");

const router = express.Router();
const STAFF_ORDER_RANGES = ["today", "week", "recent", "all"];
const STAFF_ORDERS_DEFAULT_LIMIT = 50;
const STAFF_ORDERS_MAX_LIMIT = 200;
const STAFF_RESERVATION_STATUSES = ["new", "confirmed", "seated", "completed", "cancelled"];
const STAFF_INQUIRY_STATUSES = ["new", "contacted", "converted", "closed"];
const ORDER_BILLING_COLUMNS = [
  "payment_status",
  "billing_status",
  "bill_number",
  "billed_at",
  "paid_at"
];

function isMissingStaffAccessRelationError(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  const details = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`
    .trim()
    .toLowerCase();

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (details.includes("hotel_staff_access") &&
      (details.includes("relation") ||
        details.includes("schema cache") ||
        details.includes("could not find")))
  );
}

function normalizeStatusValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getAllowedStaffStatus(value, allowedStatuses = []) {
  const normalizedStatus = normalizeStatusValue(value);
  return allowedStatuses.includes(normalizedStatus) ? normalizedStatus : "";
}

function normalizeBillNumberPart(value, fallback = "ORDER", maxLength = 18) {
  const normalizedValue = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (normalizedValue || fallback).slice(0, maxLength);
}

function buildOrderBillNumber(order = {}, billedAt = new Date().toISOString()) {
  const hotelPart = normalizeBillNumberPart(
    order.hotel_slug || order.hotel_name,
    "HOTEL",
    18
  );
  const datePart = String(billedAt || new Date().toISOString())
    .slice(0, 10)
    .replace(/[^0-9]/g, "");
  const orderIdPart = String(order.id || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(-8);

  return [
    "BILL",
    hotelPart,
    datePart || "DATE",
    orderIdPart || "ORDER"
  ].join("-");
}

function isMissingOrderBillingColumnsError(error) {
  const code = String(error?.code || "").trim().toUpperCase();
  const details = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`
    .trim()
    .toLowerCase();

  return (
    code === "PGRST204" ||
    (
      details.includes("could not find") &&
      ORDER_BILLING_COLUMNS.some((columnName) => details.includes(columnName))
    )
  );
}

function buildStaffUserResponse(staffAccess) {
  return {
    id: staffAccess.id,
    hotelSlug: staffAccess.hotel_slug,
    displayName: staffAccess.display_name || "Staff",
    role: staffAccess.role === "owner" ? "owner" : "staff"
  };
}

function buildStaffSessionResponse(staffUser = {}) {
  return {
    id: staffUser.sub || staffUser.id || "",
    hotelSlug: staffUser.hotelSlug || staffUser.hotel_slug || "",
    displayName: staffUser.displayName || staffUser.display_name || "Staff",
    role: staffUser.role === "owner" ? "owner" : "staff"
  };
}

function getStaffOrdersRange(value = "") {
  const normalizedRange = String(value || "").trim().toLowerCase();
  return STAFF_ORDER_RANGES.includes(normalizedRange) ? normalizedRange : "recent";
}

function getStaffOrdersLimit(value, range = "recent") {
  const parsedLimit = Number.parseInt(String(value || "").trim(), 10);
  const defaultLimit = range === "all" ? STAFF_ORDERS_MAX_LIMIT : STAFF_ORDERS_DEFAULT_LIMIT;

  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    return defaultLimit;
  }

  return Math.min(parsedLimit, STAFF_ORDERS_MAX_LIMIT);
}

function getStaffOrdersRangeStart(range) {
  const now = new Date();

  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (range === "week") {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    return weekStart;
  }

  return null;
}

function buildStaffOrderResponse(order = {}) {
  return {
    id: order.id,
    hotelSlug: order.hotel_slug || "",
    hotelName: order.hotel_name || "",
    orderType: order.order_type || "",
    tableNumber: order.table_number || "",
    orderSource: order.order_source || "",
    customerName: order.customer_name || "",
    customerPhone: order.customer_phone || "",
    paymentMethod: order.payment_method || "",
    paymentStatus: order.payment_status || "",
    billingStatus: order.billing_status || "",
    billNumber: order.bill_number || "",
    billedAt: order.billed_at || "",
    paidAt: order.paid_at || "",
    status: order.status || "new",
    note: order.note || "",
    items: Array.isArray(order.items) ? order.items : [],
    totals:
      order.totals && typeof order.totals === "object" && !Array.isArray(order.totals)
        ? order.totals
        : {},
    createdAt: order.created_at || ""
  };
}

function buildStaffReservationResponse(reservation = {}) {
  return {
    id: reservation.id,
    hotelSlug: reservation.hotel_slug || "",
    hotelName: reservation.hotel_name || "",
    name: reservation.name || "",
    phone: reservation.phone || "",
    date: reservation.date || "",
    time: reservation.time || "",
    guests: reservation.guests || "",
    note: reservation.note || "",
    status: reservation.status || "new",
    createdAt: reservation.created_at || ""
  };
}

function buildStaffInquiryResponse(inquiry = {}) {
  return {
    id: inquiry.id,
    hotelSlug: inquiry.hotel_slug || "",
    hotelName: inquiry.hotel_name || "",
    name: inquiry.name || "",
    phone: inquiry.phone || "",
    eventType: inquiry.event_type || "",
    date: inquiry.date || "",
    guests: inquiry.guests || "",
    specialRequirements: inquiry.special_requirements || "",
    status: inquiry.status || "new",
    createdAt: inquiry.created_at || ""
  };
}

async function updateStaffScopedRecordStatus(req, res, config = {}) {
  try {
    const hotelSlug = String(req.staffHotelSlug || "").trim();
    const recordId = String(req.params.id || "").trim();
    const status = getAllowedStaffStatus(req.body?.status, config.allowedStatuses);

    if (!hotelSlug) {
      return res.status(403).json({
        success: false,
        message: "Staff hotel scope is missing"
      });
    }

    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: `${config.label} id is required`
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${config.allowedStatuses.join(", ")}`
      });
    }

    const { data, error } = await supabase
      .from(config.table)
      .update({ status })
      .eq("id", recordId)
      .eq("hotel_slug", hotelSlug)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `${config.label} not found for this hotel`
      });
    }

    res.json({
      success: true,
      message: `${config.label} status updated`,
      [config.responseKey]: config.buildResponse(data)
    });
  } catch (error) {
    console.error(`Staff ${config.responseKey} status update error:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to update ${config.label.toLowerCase()} status`
    });
  }
}

router.post("/login", validateBody(staffLoginSchema), async (req, res) => {
  try {
    const { hotelSlug, pin } = req.validatedBody;
    const normalizedHotelSlug = String(hotelSlug || "").trim();

    const { data: staffAccessRows, error } = await supabase
      .from("hotel_staff_access")
      .select("id,hotel_slug,display_name,role,pin_hash,is_active")
      .eq("hotel_slug", normalizedHotelSlug)
      .eq("is_active", true);

    if (error) {
      if (isMissingStaffAccessRelationError(error)) {
        return res.status(503).json({
          success: false,
          message: "Staff access is not initialized yet"
        });
      }

      throw error;
    }

    const activeAccessRows = Array.isArray(staffAccessRows) ? staffAccessRows : [];
    let matchedStaffAccess = null;

    for (const staffAccess of activeAccessRows) {
      const isMatch = await bcrypt.compare(pin, staffAccess.pin_hash || "");

      if (isMatch) {
        matchedStaffAccess = staffAccess;
        break;
      }
    }

    if (!matchedStaffAccess) {
      return res.status(401).json({
        success: false,
        message: "Invalid hotel slug or PIN"
      });
    }

    await supabase
      .from("hotel_staff_access")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", matchedStaffAccess.id);

    const token = signStaffToken(matchedStaffAccess);

    res.json({
      success: true,
      message: "Staff login successful",
      token,
      staffUser: buildStaffUserResponse(matchedStaffAccess)
    });
  } catch (error) {
    console.error("Staff login error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login staff user"
    });
  }
});

router.get("/orders", requireStaffAuth, async (req, res) => {
  try {
    const hotelSlug = String(req.staffHotelSlug || "").trim();

    if (!hotelSlug) {
      return res.status(403).json({
        success: false,
        message: "Staff hotel scope is missing"
      });
    }

    const range = getStaffOrdersRange(req.query.range);
    const limit = getStaffOrdersLimit(req.query.limit, range);
    const rangeStart = getStaffOrdersRangeStart(range);
    let query = supabase
      .from("orders")
      .select("*")
      .eq("hotel_slug", hotelSlug)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (rangeStart) {
      query = query.gte("created_at", rangeStart.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const orders = (data || []).map(buildStaffOrderResponse);

    res.json({
      success: true,
      hotelSlug,
      range,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error("Staff orders fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff orders"
    });
  }
});

router.get("/reservations", requireStaffAuth, async (req, res) => {
  try {
    const hotelSlug = String(req.staffHotelSlug || "").trim();

    if (!hotelSlug) {
      return res.status(403).json({
        success: false,
        message: "Staff hotel scope is missing"
      });
    }

    const range = getStaffOrdersRange(req.query.range);
    const limit = getStaffOrdersLimit(req.query.limit, range);
    const rangeStart = getStaffOrdersRangeStart(range);
    let query = supabase
      .from("reservations")
      .select("*")
      .eq("hotel_slug", hotelSlug)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (rangeStart) {
      query = query.gte("created_at", rangeStart.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const reservations = (data || []).map(buildStaffReservationResponse);

    res.json({
      success: true,
      hotelSlug,
      range,
      count: reservations.length,
      reservations
    });
  } catch (error) {
    console.error("Staff reservations fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff reservations"
    });
  }
});

router.get("/inquiries", requireStaffAuth, async (req, res) => {
  try {
    const hotelSlug = String(req.staffHotelSlug || "").trim();

    if (!hotelSlug) {
      return res.status(403).json({
        success: false,
        message: "Staff hotel scope is missing"
      });
    }

    const range = getStaffOrdersRange(req.query.range);
    const limit = getStaffOrdersLimit(req.query.limit, range);
    const rangeStart = getStaffOrdersRangeStart(range);
    let query = supabase
      .from("inquiries")
      .select("*")
      .eq("hotel_slug", hotelSlug)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (rangeStart) {
      query = query.gte("created_at", rangeStart.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const inquiries = (data || []).map(buildStaffInquiryResponse);

    res.json({
      success: true,
      hotelSlug,
      range,
      count: inquiries.length,
      inquiries
    });
  } catch (error) {
    console.error("Staff inquiries fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff inquiries"
    });
  }
});

router.patch("/reservations/:id/status", requireStaffAuth, async (req, res) => {
  await updateStaffScopedRecordStatus(req, res, {
    table: "reservations",
    label: "Reservation",
    responseKey: "reservation",
    allowedStatuses: STAFF_RESERVATION_STATUSES,
    buildResponse: buildStaffReservationResponse
  });
});

router.patch("/inquiries/:id/status", requireStaffAuth, async (req, res) => {
  await updateStaffScopedRecordStatus(req, res, {
    table: "inquiries",
    label: "Inquiry",
    responseKey: "inquiry",
    allowedStatuses: STAFF_INQUIRY_STATUSES,
    buildResponse: buildStaffInquiryResponse
  });
});

router.patch("/orders/:id/mark-billed", requireStaffAuth, async (req, res) => {
  try {
    const hotelSlug = String(req.staffHotelSlug || "").trim();
    const orderId = String(req.params.id || "").trim();

    if (!hotelSlug) {
      return res.status(403).json({
        success: false,
        message: "Staff hotel scope is missing"
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order id is required"
      });
    }

    const { data: currentOrder, error: currentOrderError } = await supabase
      .from("orders")
      .select("id,hotel_slug,hotel_name,bill_number,billing_status,billed_at")
      .eq("id", orderId)
      .eq("hotel_slug", hotelSlug)
      .maybeSingle();

    if (currentOrderError) {
      if (isMissingOrderBillingColumnsError(currentOrderError)) {
        return res.status(400).json({
          success: false,
          message: "Order billing fields are not initialized yet"
        });
      }

      throw currentOrderError;
    }

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this hotel"
      });
    }

    const isAlreadyBilled = normalizeStatusValue(currentOrder.billing_status) === "billed";
    const billedAt = isAlreadyBilled && currentOrder.billed_at
      ? currentOrder.billed_at
      : new Date().toISOString();
    const updatePayload = {
      billing_status: "billed",
      billed_at: billedAt
    };

    if (!currentOrder.bill_number) {
      updatePayload.bill_number = buildOrderBillNumber(currentOrder, billedAt);
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("hotel_slug", hotelSlug)
      .select()
      .single();

    if (error) {
      if (isMissingOrderBillingColumnsError(error)) {
        return res.status(400).json({
          success: false,
          message: "Order billing fields are not initialized yet"
        });
      }

      throw error;
    }

    res.json({
      success: true,
      message: "Order marked billed",
      order: buildStaffOrderResponse(data)
    });
  } catch (error) {
    console.error("Staff mark billed error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark order billed"
    });
  }
});

router.patch("/orders/:id/mark-paid", requireStaffAuth, async (req, res) => {
  try {
    const hotelSlug = String(req.staffHotelSlug || "").trim();
    const orderId = String(req.params.id || "").trim();

    if (!hotelSlug) {
      return res.status(403).json({
        success: false,
        message: "Staff hotel scope is missing"
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order id is required"
      });
    }

    const { data: currentOrder, error: currentOrderError } = await supabase
      .from("orders")
      .select("id,hotel_slug,payment_status,paid_at")
      .eq("id", orderId)
      .eq("hotel_slug", hotelSlug)
      .maybeSingle();

    if (currentOrderError) {
      if (isMissingOrderBillingColumnsError(currentOrderError)) {
        return res.status(400).json({
          success: false,
          message: "Order billing fields are not initialized yet"
        });
      }

      throw currentOrderError;
    }

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this hotel"
      });
    }

    const isAlreadyPaid = normalizeStatusValue(currentOrder.payment_status) === "paid";
    const paidAt = isAlreadyPaid && currentOrder.paid_at
      ? currentOrder.paid_at
      : new Date().toISOString();

    const { data, error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        paid_at: paidAt
      })
      .eq("id", orderId)
      .eq("hotel_slug", hotelSlug)
      .select()
      .single();

    if (error) {
      if (isMissingOrderBillingColumnsError(error)) {
        return res.status(400).json({
          success: false,
          message: "Order billing fields are not initialized yet"
        });
      }

      throw error;
    }

    res.json({
      success: true,
      message: "Order marked paid",
      order: buildStaffOrderResponse(data)
    });
  } catch (error) {
    console.error("Staff mark paid error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark order paid"
    });
  }
});

router.get("/me", requireStaffAuth, (req, res) => {
  res.json({
    success: true,
    staffUser: buildStaffSessionResponse(req.staffUser)
  });
});

module.exports = router;
