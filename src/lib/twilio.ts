/**
 * Twilio client — fetch-based, no npm dependency.
 *
 * This file handles two distinct Twilio products:
 *   1. Verify API — OTP codes for sign-up/sign-in. Twilio generates and
 *      verifies the code; we never see it. Uses the Verify Service SID.
 *   2. Messaging API — transactional SMS like "your order shipped."
 *      Uses a Messaging Service SID (preferred — handles STOP/HELP
 *      auto-replies, opt-out tracking, and fallback routing) OR a
 *      specific From number.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID            — starts with "AC..."
 *   TWILIO_AUTH_TOKEN             — from Twilio console
 *   TWILIO_VERIFY_SERVICE_SID     — starts with "VA..." (for OTP)
 *   TWILIO_MESSAGING_SERVICE_SID  — starts with "MG..." (for transactional SMS)
 *                                   OR
 *   TWILIO_FROM_NUMBER            — E.164 phone number you own
 *
 * Docs:
 *   https://www.twilio.com/docs/verify/api
 *   https://www.twilio.com/docs/messaging/api
 */

const TWILIO_BASE = "https://verify.twilio.com/v2";
const TWILIO_MESSAGING_BASE = "https://api.twilio.com/2010-04-01";

function getCreds() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID."
    );
  }

  return { accountSid, authToken, serviceSid };
}

function basicAuth(accountSid: string, authToken: string): string {
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

/**
 * Normalize a phone input to E.164 format.
 * - Accepts "4691234567", "(469) 123-4567", "+1 469-123-4567", etc.
 * - If countryCode is provided (e.g. "+1"), prepends it when missing.
 * - Returns null if the number cannot be normalized.
 */
export function normalizePhone(raw: string, countryCode = "+1"): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Already in E.164 (starts with +, digits only after)
  if (/^\+[1-9]\d{6,14}$/.test(trimmed)) return trimmed;

  // Strip all non-digits
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;

  // If countryCode given and number doesn't already include it, prepend
  const cc = countryCode.replace(/\D/g, "");
  if (digits.startsWith(cc)) {
    return "+" + digits;
  }
  return `+${cc}${digits}`;
}

export interface SendCodeResult {
  status: "pending" | "approved" | "canceled";
  sid: string;
  to: string;
}

/**
 * Send a verification code to the given E.164 phone number via SMS.
 * Twilio's Verify service will generate the code and deliver it.
 */
export async function sendVerificationCode(phoneE164: string): Promise<SendCodeResult> {
  const { accountSid, authToken, serviceSid } = getCreds();

  const params = new URLSearchParams({
    To: phoneE164,
    Channel: "sms",
  });

  const res = await fetch(
    `${TWILIO_BASE}/Services/${serviceSid}/Verifications`,
    {
      method: "POST",
      headers: {
        "Authorization": basicAuth(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Twilio send failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return {
    status: data.status,
    sid: data.sid,
    to: data.to,
  };
}

export interface CheckCodeResult {
  valid: boolean;
  status: "pending" | "approved" | "canceled" | "expired";
}

/**
 * Verify the code the user submitted against Twilio's stored code.
 * Twilio enforces expiry (10 min default) and max attempts (5 per code).
 */
export async function checkVerificationCode(
  phoneE164: string,
  code: string
): Promise<CheckCodeResult> {
  const { accountSid, authToken, serviceSid } = getCreds();

  const params = new URLSearchParams({
    To: phoneE164,
    Code: code,
  });

  const res = await fetch(
    `${TWILIO_BASE}/Services/${serviceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        "Authorization": basicAuth(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (res.status === 404) {
    // Twilio returns 404 when the verification has expired or doesn't exist
    return { valid: false, status: "expired" };
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Twilio verify failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return {
    valid: data.status === "approved" && data.valid === true,
    status: data.status,
  };
}

// ── Messaging API (transactional SMS) ────────────────────────

/**
 * Send an SMS via Twilio's Messaging API.
 *
 * Prefers TWILIO_MESSAGING_SERVICE_SID (a Messaging Service) over a raw
 * From number — Messaging Services auto-handle STOP/HELP opt-out keywords
 * and provide fallback routing, which is required for A2P 10DLC compliance
 * on US traffic.
 *
 * Returns `null` (no error) if neither env var is configured — the caller
 * should treat SMS as a best-effort channel so a Twilio misconfig never
 * blocks a fulfillment code path.
 */
export async function sendSMS(toE164: string, body: string): Promise<{ sid: string } | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken) {
    console.warn("[twilio sms] not configured (missing account SID or auth token)");
    return null;
  }
  if (!messagingServiceSid && !fromNumber) {
    console.warn("[twilio sms] not configured (need TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER)");
    return null;
  }

  const params = new URLSearchParams({
    To: toE164,
    Body: body,
    ...(messagingServiceSid
      ? { MessagingServiceSid: messagingServiceSid }
      : { From: fromNumber! }),
  });

  const res = await fetch(
    `${TWILIO_MESSAGING_BASE}/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Twilio SMS failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return { sid: data.sid };
}

/**
 * Transactional SMS for order-shipped events. Short, branded, no promo,
 * includes a link to the carrier's tracking page (or our /track fallback
 * if no URL was resolved) and the STOP footer on first sends.
 *
 * Caller passes the full context so we don't have to requery the DB here;
 * keeps this fn pure + testable.
 */
export async function sendOrderShippedSMS(params: {
  toE164: string;
  firstName?: string | null;
  orderNumber: string;
  trackingNumber: string;
  carrier?: string | null;
  trackingUrl?: string | null;
  siteUrl?: string;
}): Promise<{ sid: string } | null> {
  const {
    toE164,
    firstName,
    orderNumber,
    trackingNumber,
    carrier,
    trackingUrl,
    siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com",
  } = params;

  const name = firstName ? `, ${firstName}` : "";
  const carrierLabel = carrier ? ` via ${carrier.toUpperCase()}` : "";
  const link = trackingUrl || `${siteUrl}/track/${orderNumber}`;

  // SMS kept under 160 chars whenever possible so it fits a single segment
  // (multi-segment SMS bills per segment). "Reply STOP to opt out" is
  // required text on any campaign-registered 10DLC sender; Twilio's
  // Messaging Service adds it automatically on first message per recipient.
  const body =
    `Based Research${name}: your order ${orderNumber} shipped${carrierLabel}. ` +
    `Tracking: ${trackingNumber}. Track here: ${link}`;

  return sendSMS(toE164, body);
}
