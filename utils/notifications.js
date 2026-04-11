const { supabase } = require("./supabase");
const { env } = require("../config/env");
const nodemailer = require("nodemailer");

const NOTIFICATION_SOURCE_EVENT_TYPES = {
  order: "order_created",
  reservation: "reservation_created",
  inquiry: "inquiry_created"
};
const NOTIFICATION_SOURCE_SETTING_KEYS = {
  order: "notifyOnNewOrder",
  reservation: "notifyOnNewReservation",
  inquiry: "notifyOnNewInquiry"
};

const NOTIFICATION_DELIVERY_CHANNEL = "internal";
const NOTIFICATION_PENDING_STATUS = "pending";
const NOTIFICATION_SKIPPED_STATUS = "skipped";
const NOTIFICATION_SENT_STATUS = "sent";
const NOTIFICATION_FAILED_STATUS = "failed";

let notificationEmailTransporter = null;

function normalizeSourceType(value = "") {
  const candidate = String(value || "").trim().toLowerCase();

  if (!NOTIFICATION_SOURCE_EVENT_TYPES[candidate]) {
    throw new Error(`Unsupported notification source type: ${value}`);
  }

  return candidate;
}

function normalizeEventType(sourceType, eventType) {
  const fallbackEventType = NOTIFICATION_SOURCE_EVENT_TYPES[sourceType];
  const candidate = String(eventType || fallbackEventType).trim().toLowerCase();

  if (candidate !== fallbackEventType) {
    throw new Error(`Unsupported notification event type: ${eventType}`);
  }

  return candidate;
}

function buildNotificationEventRecord({
  hotelSlug,
  sourceType,
  sourceId,
  eventType,
  payload
}) {
  const normalizedSourceType = normalizeSourceType(sourceType);
  const normalizedSourceId = String(sourceId || "").trim();

  if (!normalizedSourceId) {
    throw new Error("Notification sourceId is required");
  }

  return {
    hotel_slug: hotelSlug ? String(hotelSlug).trim() : null,
    source_type: normalizedSourceType,
    source_id: normalizedSourceId,
    event_type: normalizeEventType(normalizedSourceType, eventType),
    delivery_channel: NOTIFICATION_DELIVERY_CHANNEL,
    status: NOTIFICATION_PENDING_STATUS,
    payload:
      payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {},
    error_message: null,
    processed_at: null,
    updated_at: new Date().toISOString()
  };
}

async function createNotificationEvent(input = {}) {
  const record = buildNotificationEventRecord(input);

  const { data, error } = await supabase
    .from("notification_events")
    .insert([record])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function buildHotelNotificationSettings(settingsRow, hotelSlug = "") {
  return {
    exists: !!settingsRow,
    hotelSlug: settingsRow?.hotel_slug || String(hotelSlug || "").trim(),
    emailEnabled: !!settingsRow?.email_enabled,
    ownerEmail: settingsRow?.owner_email || "",
    notifyOnNewOrder:
      settingsRow?.notify_on_new_order !== undefined
        ? !!settingsRow.notify_on_new_order
        : true,
    notifyOnNewReservation:
      settingsRow?.notify_on_new_reservation !== undefined
        ? !!settingsRow.notify_on_new_reservation
        : true,
    notifyOnNewInquiry:
      settingsRow?.notify_on_new_inquiry !== undefined
        ? !!settingsRow.notify_on_new_inquiry
        : true
  };
}

async function fetchHotelNotificationSettings(hotelSlug = "") {
  const normalizedHotelSlug = String(hotelSlug || "").trim();

  if (!normalizedHotelSlug) {
    return buildHotelNotificationSettings(null, "");
  }

  const { data, error } = await supabase
    .from("hotel_notification_settings")
    .select("*")
    .eq("hotel_slug", normalizedHotelSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return buildHotelNotificationSettings(data, normalizedHotelSlug);
}

async function updateNotificationEventStatus(
  notificationEventId,
  { status, errorMessage = null, processedAt = null } = {}
) {
  const normalizedId = String(notificationEventId || "").trim();

  if (!normalizedId) {
    throw new Error("Notification event id is required");
  }

  const updatePayload = {
    updated_at: new Date().toISOString()
  };

  if (status) {
    updatePayload.status = String(status).trim().toLowerCase();
  }

  if (errorMessage !== undefined) {
    updatePayload.error_message = errorMessage ? String(errorMessage) : null;
  }

  if (processedAt !== undefined) {
    updatePayload.processed_at = processedAt || null;
  }

  const { data, error } = await supabase
    .from("notification_events")
    .update(updatePayload)
    .eq("id", normalizedId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function isNotificationEnabledForSourceType(sourceType, hotelSettings) {
  const normalizedSourceType = normalizeSourceType(sourceType);
  const settingsKey = NOTIFICATION_SOURCE_SETTING_KEYS[normalizedSourceType];

  if (!settingsKey) {
    return false;
  }

  return !!hotelSettings?.[settingsKey];
}

function isNotificationSmtpConfigured() {
  return (
    !!String(env.notificationSmtpHost || "").trim() &&
    Number.isFinite(Number(env.notificationSmtpPort || 0)) &&
    Number(env.notificationSmtpPort || 0) > 0 &&
    !!String(env.notificationSmtpUser || "").trim() &&
    !!String(env.notificationSmtpPass || "").trim() &&
    !!String(env.notificationEmailFrom || "").trim()
  );
}

function getNotificationEmailTransporter() {
  if (notificationEmailTransporter) {
    return notificationEmailTransporter;
  }

  notificationEmailTransporter = nodemailer.createTransport({
    host: String(env.notificationSmtpHost || "").trim(),
    port: Number(env.notificationSmtpPort || 587),
    secure: !!env.notificationSmtpSecure,
    auth: {
      user: String(env.notificationSmtpUser || "").trim(),
      pass: String(env.notificationSmtpPass || "")
    }
  });

  return notificationEmailTransporter;
}

function buildNotificationEmailSubject(notificationEvent = {}) {
  const sourceType = String(notificationEvent.source_type || "event")
    .trim()
    .toLowerCase();
  const hotelSlug = String(notificationEvent.hotel_slug || "unknown-hotel").trim();
  const sourceId = String(notificationEvent.source_id || "").trim();
  const payload =
    notificationEvent.payload &&
    typeof notificationEvent.payload === "object" &&
    !Array.isArray(notificationEvent.payload)
      ? notificationEvent.payload
      : {};
  const tableNumber = String(payload.orderContext?.tableNumber || "").trim();

  if (sourceType === "order") {
    return `New order received (${hotelSlug})${tableNumber ? ` Table ${tableNumber}` : ""}${sourceId ? ` #${sourceId}` : ""}`;
  }

  if (sourceType === "reservation") {
    return `New reservation received (${hotelSlug})${
      sourceId ? ` #${sourceId}` : ""
    }`;
  }

  if (sourceType === "inquiry") {
    return `New inquiry received (${hotelSlug})${sourceId ? ` #${sourceId}` : ""}`;
  }

  return `New notification event (${hotelSlug})${sourceId ? ` #${sourceId}` : ""}`;
}

function buildNotificationEmailText(notificationEvent = {}) {
  const payload =
    notificationEvent.payload &&
    typeof notificationEvent.payload === "object" &&
    !Array.isArray(notificationEvent.payload)
      ? notificationEvent.payload
      : {};

  const payloadText = JSON.stringify(payload, null, 2);

  return [
    "A new notification event was recorded.",
    "",
    `Hotel: ${String(notificationEvent.hotel_slug || "")}`,
    `Source type: ${String(notificationEvent.source_type || "")}`,
    `Event type: ${String(notificationEvent.event_type || "")}`,
    `Source id: ${String(notificationEvent.source_id || "")}`,
    `Created at: ${String(notificationEvent.created_at || "")}`,
    "",
    "Payload:",
    payloadText
  ].join("\n");
}

async function sendNotificationEventEmail(notificationEvent = {}, hotelSettings = {}) {
  const transporter = getNotificationEmailTransporter();

  return transporter.sendMail({
    from: String(env.notificationEmailFrom || "").trim(),
    to: String(hotelSettings.ownerEmail || "").trim(),
    subject: buildNotificationEmailSubject(notificationEvent),
    text: buildNotificationEmailText(notificationEvent)
  });
}

function getNotificationDeliverySkipReason(notificationEvent = {}, hotelSettings = null) {
  const configuredChannel = String(
    env.notificationDeliveryChannel || NOTIFICATION_DELIVERY_CHANNEL
  )
    .trim()
    .toLowerCase();
  const hotelSlug = String(notificationEvent.hotel_slug || "").trim();
  const sourceType = String(notificationEvent.source_type || "").trim().toLowerCase();

  if (!hotelSlug) {
    return "Notification event missing hotel slug";
  }

  if (!hotelSettings?.exists) {
    return "Notification settings not configured for hotel";
  }

  if (!hotelSettings.emailEnabled) {
    return "Hotel email notifications disabled";
  }

  if (!isNotificationEnabledForSourceType(sourceType, hotelSettings)) {
    return `Notification type "${sourceType}" disabled for hotel`;
  }

  if (!hotelSettings.ownerEmail) {
    return "Hotel notification email not configured";
  }

  if (!env.notificationDeliveryEnabled) {
    return "Notification delivery disabled by config";
  }

  if (configuredChannel === "internal") {
    return "Notification delivery channel is internal only";
  }

  if (configuredChannel === "email") {
    if (!isNotificationSmtpConfigured()) {
      return "Notification SMTP/email configuration is incomplete";
    }

    return "";
  }

  return `Notification delivery channel "${configuredChannel}" is not implemented yet`;
}

async function processNotificationEventDelivery(notificationEvent = {}) {
  const processedAt = new Date().toISOString();
  const hotelSettings = await fetchHotelNotificationSettings(
    notificationEvent.hotel_slug || ""
  );
  const skipReason = getNotificationDeliverySkipReason(
    notificationEvent,
    hotelSettings
  );

  if (skipReason) {
    return updateNotificationEventStatus(notificationEvent.id, {
      status: NOTIFICATION_SKIPPED_STATUS,
      errorMessage: skipReason,
      processedAt
    });
  }

  try {
    await sendNotificationEventEmail(notificationEvent, hotelSettings);

    return updateNotificationEventStatus(notificationEvent.id, {
      status: NOTIFICATION_SENT_STATUS,
      errorMessage: null,
      processedAt
    });
  } catch (error) {
    return updateNotificationEventStatus(notificationEvent.id, {
      status: NOTIFICATION_FAILED_STATUS,
      errorMessage: error.message || "Notification delivery failed",
      processedAt
    });
  }
}

async function processNotificationEventDeliverySafely(notificationEvent = {}) {
  try {
    return await processNotificationEventDelivery(notificationEvent);
  } catch (error) {
    console.error("Notification delivery process failed:", {
      notificationEventId: notificationEvent.id || null,
      sourceType: notificationEvent.source_type || null,
      sourceId: notificationEvent.source_id || null,
      message: error.message
    });

    return null;
  }
}

async function createNotificationEventSafely(input = {}) {
  try {
    const notificationEvent = await createNotificationEvent(input);
    const processedEvent = await processNotificationEventDeliverySafely(
      notificationEvent
    );

    return processedEvent || notificationEvent;
  } catch (error) {
    console.error("Notification event log failed:", {
      hotelSlug: input.hotelSlug || null,
      sourceType: input.sourceType || null,
      sourceId: input.sourceId || null,
      message: error.message
    });

    return null;
  }
}

module.exports = {
  buildHotelNotificationSettings,
  createNotificationEvent,
  createNotificationEventSafely,
  fetchHotelNotificationSettings,
  getNotificationEmailTransporter,
  processNotificationEventDelivery,
  processNotificationEventDeliverySafely,
  sendNotificationEventEmail,
  updateNotificationEventStatus
};
