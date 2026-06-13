import { db } from "@/lib/db";
import { emailLog } from "@/lib/db/schema";

const MAILTRAP_API_KEY = process.env.MAILTRAP_API_KEY || "";
const FROM_EMAIL = "noreply@basedresearch.com";
const FROM_NAME = "Based Research";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com";

interface EmailMeta {
  // Logical template tag for the admin Outbox filter. See schema for
  // the canonical list. Optional — sends without a tag still log; they
  // just appear under "(untagged)" in the admin filter.
  template?: string;
  // Optional cross-link IDs so the Outbox row can deep-link to the
  // related order or customer record.
  orderId?: string;
  userId?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  meta?: EmailMeta;
}

// Bodies are stored full-fidelity in email_log so the admin Outbox can
// render exactly what the recipient saw. Cap each at 256 KB so a
// runaway template can't blow up a single row. (Practical email
// payloads are well under this; the cap is just a safety net.)
const BODY_STORAGE_CAP = 256 * 1024;
function clampBody(s: string | undefined): string {
  if (!s) return "";
  return s.length > BODY_STORAGE_CAP ? s.slice(0, BODY_STORAGE_CAP) : s;
}

/**
 * Log a single email-send attempt. Never throws — logging failure must
 * not block actual email delivery, since the email is already either
 * sent or failed by the time we hit this. Errors here just go to
 * Vercel logs.
 */
async function logEmailAttempt(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  meta?: EmailMeta;
  status: "sent" | "failed";
  providerMessageId?: string | null;
  providerResponse?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await db.insert(emailLog).values({
      toEmail: params.to.toLowerCase(),
      subject: params.subject.slice(0, 500),
      template: params.meta?.template ?? null,
      status: params.status,
      provider: "mailtrap",
      providerMessageId: params.providerMessageId ?? null,
      providerResponse: params.providerResponse
        ? params.providerResponse.slice(0, 4000)
        : null,
      errorMessage: params.errorMessage ?? null,
      htmlBody: clampBody(params.html),
      textBody: clampBody(params.text),
      relatedOrderId: params.meta?.orderId ?? null,
      relatedUserId: params.meta?.userId ?? null,
    });
  } catch (err) {
    console.error("[email_log] insert failed:", err);
  }
}

export async function sendEmail({
  to, subject, html, text, meta,
}: SendEmailParams) {
  let res: Response;
  try {
    res = await fetch("https://send.api.mailtrap.io/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": MAILTRAP_API_KEY,
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to }],
        subject,
        html,
        text: text || "",
      }),
    });
  } catch (err) {
    // Network failure before we even got an HTTP status. Log + rethrow
    // so the caller's existing error path still fires.
    const msg = (err as Error).message || "network error";
    await logEmailAttempt({
      to, subject, html, text, meta,
      status: "failed",
      errorMessage: `network error: ${msg}`,
    });
    throw err;
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Mailtrap] Send failed:", errText);
    await logEmailAttempt({
      to, subject, html, text, meta,
      status: "failed",
      providerResponse: errText,
      errorMessage: `Mailtrap HTTP ${res.status}`,
    });
    throw new Error("Failed to send email");
  }

  // Success path. Mailtrap returns `{ success: true, message_ids: [string] }`.
  const json = (await res.json()) as {
    success?: boolean;
    message_ids?: string[];
  };
  const providerMessageId = json.message_ids?.[0] ?? null;

  await logEmailAttempt({
    to, subject, html, text, meta,
    status: "sent",
    providerMessageId,
    providerResponse: JSON.stringify(json).slice(0, 4000),
  });

  return json;
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://basedresearch.com"}/auth/reset-password?token=${resetToken}`;

  await sendEmail({
    to: email,
    subject: "Reset Your Password — Based Research",
    meta: { template: "password_reset" },
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1a1a19; margin: 0;">Based Research</h1>
        </div>
        <h2 style="font-size: 20px; color: #1a1a19; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="font-size: 15px; color: #737373; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset the password for your account. Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #1E3A5F; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #999; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email. Your password will not be changed.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 11px; color: #999; text-align: center;">
          Based Research · Research-Grade Peptides
        </p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}

// ── Abandoned cart emails ───────────────────────────────
interface AbandonedCartItem {
  productName: string;
  variantSize: string;
  slug: string;
  quantity: number;
  price: number; // cents
}

const CART_EMAIL_STYLES = {
  body: "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #ffffff;",
  h1: "font-size: 24px; color: #1a1a19; margin: 0 0 8px;",
  h2: "font-size: 20px; color: #1a1a19; margin-bottom: 16px;",
  p: "font-size: 15px; color: #737373; line-height: 1.6; margin-bottom: 16px;",
  button: "display: inline-block; background-color: #1E3A5F; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;",
  item: "display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #1a1a19;",
  footer: "font-size: 11px; color: #999; text-align: center; margin-top: 32px;",
};

function renderCartTable(items: AbandonedCartItem[], subtotal: number): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;">
          <div style="color: #1a1a19; font-weight: 500;">${i.productName}</div>
          <div style="color: #737373; font-size: 12px;">${i.variantSize} · Qty ${i.quantity}</div>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right; color: #1a1a19; font-weight: 500;">
          $${((i.price * i.quantity) / 100).toFixed(2)}
        </td>
      </tr>`
    )
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tbody>
        ${rows}
        <tr>
          <td style="padding: 14px 0 0; font-size: 15px; font-weight: 600; color: #1a1a19;">Subtotal</td>
          <td style="padding: 14px 0 0; text-align: right; font-size: 15px; font-weight: 600; color: #1a1a19;">
            $${(subtotal / 100).toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Order confirmation email — fired right after a successful checkout
 * and re-sendable from admin tooling for orders that slipped past the
 * auto-send.
 *
 * Surface contract: the customer wants to verify three things at a
 * glance — what they bought, what they paid, and where it's going.
 * Everything else (tracking, returns policy, support contact) is a
 * footer-level detail.
 */
export async function sendOrderConfirmationEmail(opts: {
  email: string;
  orderNumber: string;
  firstName: string | null;
  items: Array<{
    productName: string;
    variantSize: string;
    quantity: number;
    unitPrice: number;   // cents
    lineTotal: number;   // cents
  }>;
  subtotal: number;       // cents
  shippingCost: number;   // cents
  discount: number;       // cents (positive number, subtracted from subtotal)
  cardSurcharge: number;  // cents (added on the card path)
  total: number;          // cents
  paymentMethod: "ach" | "card";
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
}) {
  const greeting = opts.firstName ? `Hi ${opts.firstName},` : "Hi,";
  const orderUrl = `${SITE_URL}/account/orders`;

  const itemRows = opts.items
    .map(
      (i) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; vertical-align: top;">
          <div style="color: #1a1a19; font-weight: 600;">${i.productName}</div>
          <div style="color: #737373; font-size: 12px; margin-top: 2px;">
            ${i.variantSize} · Qty ${i.quantity} · $${(i.unitPrice / 100).toFixed(2)} each
          </div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; color: #1a1a19; font-weight: 600; vertical-align: top; white-space: nowrap;">
          $${(i.lineTotal / 100).toFixed(2)}
        </td>
      </tr>`,
    )
    .join("");

  const totalRows: string[] = [
    `<tr><td style="padding: 6px 0; font-size: 14px; color: #737373;">Subtotal</td>
       <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #1a1a19;">$${(opts.subtotal / 100).toFixed(2)}</td></tr>`,
    `<tr><td style="padding: 6px 0; font-size: 14px; color: #737373;">Shipping</td>
       <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #1a1a19;">${opts.shippingCost === 0 ? "Free" : `$${(opts.shippingCost / 100).toFixed(2)}`}</td></tr>`,
  ];
  if (opts.discount > 0) {
    totalRows.push(
      `<tr><td style="padding: 6px 0; font-size: 14px; color: #16a34a;">Discount</td>
         <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #16a34a; font-weight: 600;">-$${(opts.discount / 100).toFixed(2)}</td></tr>`,
    );
  }
  if (opts.cardSurcharge > 0) {
    totalRows.push(
      `<tr><td style="padding: 6px 0; font-size: 14px; color: #737373;">Processing fee (3%)</td>
         <td style="padding: 6px 0; text-align: right; font-size: 14px; color: #1a1a19;">$${(opts.cardSurcharge / 100).toFixed(2)}</td></tr>`,
    );
  }
  totalRows.push(
    `<tr><td style="padding: 12px 0 0; border-top: 2px solid #1a1a19; font-size: 16px; font-weight: 700; color: #1a1a19;">Total</td>
       <td style="padding: 12px 0 0; border-top: 2px solid #1a1a19; text-align: right; font-size: 16px; font-weight: 700; color: #1a1a19;">$${(opts.total / 100).toFixed(2)}</td></tr>`,
  );

  const addr = opts.shippingAddress;
  const addressBlock = `
    <div style="font-size: 14px; color: #1a1a19; line-height: 1.55;">
      <div style="font-weight: 600;">${addr.firstName} ${addr.lastName}</div>
      <div>${addr.address1}</div>
      ${addr.address2 ? `<div>${addr.address2}</div>` : ""}
      <div>${addr.city}, ${addr.state} ${addr.zip}</div>
    </div>
  `;

  const paymentLabel =
    opts.paymentMethod === "ach"
      ? "Bank account (ACH)"
      : "Credit / debit card";

  const html = `
    <div style="${CART_EMAIL_STYLES.body}">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="${CART_EMAIL_STYLES.h1}">Based Research</h1>
        <p style="font-size: 12px; color: #999; letter-spacing: 1px; text-transform: uppercase; margin: 0;">Research-Grade Peptides</p>
      </div>

      <div style="background: #f4f7fa; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Order Confirmed</div>
        <div style="font-size: 22px; font-weight: 700; color: #1a1a19; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${opts.orderNumber}</div>
      </div>

      <p style="${CART_EMAIL_STYLES.p}">
        ${greeting} thanks for your order. Your payment has been received and your package is being prepared. You'll get a separate email with tracking once it ships — typically within 24 business hours.
      </p>

      <h2 style="font-size: 14px; font-weight: 700; color: #1a1a19; text-transform: uppercase; letter-spacing: 1px; margin-top: 28px; margin-bottom: 8px;">
        Items
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tbody>
          ${totalRows.join("")}
        </tbody>
      </table>

      <div style="margin-top: 28px; display: grid; gap: 20px;">
        <div>
          <div style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Shipping to</div>
          ${addressBlock}
        </div>
        <div>
          <div style="font-size: 12px; color: #737373; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Payment</div>
          <div style="font-size: 14px; color: #1a1a19;">${paymentLabel}</div>
        </div>
      </div>

      ${
        opts.paymentMethod === "card"
          ? `
      <!-- Billing-name disclaimer — some payment processors settle under a
           proxy/descriptor merchant name the merchant cannot control.
           Including this notice up front cuts "I don't recognize this
           charge" disputes before they happen. -->
      <div style="margin-top: 24px; padding: 14px 16px; background: #fef9e7; border: 1px solid #f4d35e; border-radius: 8px;">
        <div style="font-size: 12px; font-weight: 700; color: #8a6d00; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
          Please note
        </div>
        <p style="font-size: 13px; color: #4a3a00; line-height: 1.55; margin: 0 0 8px;">
          Your payment may appear under a different billing name on your statement. This is our secure payment partner and does not affect the legitimacy or status of your order.
        </p>
        <p style="font-size: 13px; color: #4a3a00; line-height: 1.55; margin: 0;">
          If you have any questions, please contact us at
          <a href="mailto:support@basedresearch.com" style="color: #1E3A5F; font-weight: 600;">support@basedresearch.com</a>
          before opening a dispute.
        </p>
      </div>
      `
          : ""
      }

      <div style="text-align: center; margin: 32px 0 16px;">
        <a href="${orderUrl}" style="${CART_EMAIL_STYLES.button}">View order &amp; tracking</a>
      </div>

      <p style="font-size: 13px; color: #737373; line-height: 1.55; margin-top: 24px;">
        Questions about your order? Reply to this email or reach us at
        <a href="mailto:support@basedresearch.com" style="color: #1E3A5F;">support@basedresearch.com</a>.
        Every batch is independently HPLC-verified by an A2LA-accredited lab — your COAs are linked from the order page.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="${CART_EMAIL_STYLES.footer}">
        Based Research<br />
        For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.
      </p>
    </div>
  `;

  const itemSummary = opts.items
    .map((i) => `${i.productName} ${i.variantSize} × ${i.quantity} — $${(i.lineTotal / 100).toFixed(2)}`)
    .join("\n");

  const text = `Order ${opts.orderNumber} confirmed — Based Research

${greeting}

Thanks for your order. Payment received; your package is being prepared and ships within 24 business hours.

ITEMS
${itemSummary}

Subtotal: $${(opts.subtotal / 100).toFixed(2)}
Shipping: ${opts.shippingCost === 0 ? "Free" : `$${(opts.shippingCost / 100).toFixed(2)}`}
${opts.discount > 0 ? `Discount: -$${(opts.discount / 100).toFixed(2)}\n` : ""}${opts.cardSurcharge > 0 ? `Processing fee: $${(opts.cardSurcharge / 100).toFixed(2)}\n` : ""}Total: $${(opts.total / 100).toFixed(2)}

SHIPPING TO
${addr.firstName} ${addr.lastName}
${addr.address1}${addr.address2 ? `\n${addr.address2}` : ""}
${addr.city}, ${addr.state} ${addr.zip}

Payment: ${paymentLabel}
${
  opts.paymentMethod === "card"
    ? `
PLEASE NOTE
Your payment may appear under a different billing name on your statement. This is our secure payment partner and does not affect the legitimacy or status of your order. If you have any questions, please contact us at support@basedresearch.com before opening a dispute.
`
    : ""
}
View order: ${orderUrl}

Questions? support@basedresearch.com
`;

  await sendEmail({
    to: opts.email,
    subject: `Order ${opts.orderNumber} confirmed — Based Research`,
    meta: { template: "order_confirmation" },
    html,
    text,
  });
}

export async function sendAbandonedCartEmail(opts: {
  email: string;
  stage: 1 | 2 | 3;
  items: AbandonedCartItem[];
  subtotal: number;
  recoveryToken: string;
  // Optional stage-3 recovery coupon. When present, the cart link
  // carries ?code= so the code auto-applies without the customer
  // having to type it, and the email body gets a prominent code block.
  recoveryCoupon?: { code: string; discountPercent: number } | null;
}) {
  const cartUrl = opts.recoveryCoupon
    ? `${SITE_URL}/cart?restore=${opts.recoveryToken}&code=${opts.recoveryCoupon.code}`
    : `${SITE_URL}/cart?restore=${opts.recoveryToken}`;
  const itemsHtml = renderCartTable(opts.items, opts.subtotal);

  // Three-stage cadence, each one pushing a different lever:
  //   Stage 1 (1hr): soft "we saved your cart" reminder, no pressure
  //   Stage 2 (24hr): lean on the ACH 5% discount — concrete savings hook
  //   Stage 3 (48hr): scarcity (cart expiring) + ACH savings restated
  const achSavings = Math.round(opts.subtotal * 0.05);
  const achSavingsFormatted = `$${(achSavings / 100).toFixed(2)}`;

  const content =
    opts.stage === 1
      ? {
          subject: "You left something in your cart",
          heading: "Still researching?",
          body: `We saved your cart so you can pick up where you left off. Your selections are waiting — click below to complete your order. Every batch HPLC purity-verified by an A2LA-accredited independent lab, with a public Certificate of Analysis for every lot.`,
          cta: "Return to your cart",
        }
      : opts.stage === 2
        ? {
            subject: `Save ${achSavingsFormatted} on your cart with ACH checkout`,
            heading: "Pay with your bank account, save 5%",
            body: `Your cart is still saved. Heads up: we now offer a <strong>5% discount when you check out with ACH</strong> (bank transfer) — that's <strong>${achSavingsFormatted} off</strong> your current cart. Same-day settlement, no processing fees. Credit cards still work, just with a small processing fee.`,
            cta: "Checkout with ACH",
          }
        : {
            subject: opts.recoveryCoupon
              ? `Your ${opts.recoveryCoupon.discountPercent}% recovery code — expires soon`
              : "Last chance — your cart expires soon",
            heading: opts.recoveryCoupon
              ? `Here's ${opts.recoveryCoupon.discountPercent}% off to finish your order`
              : "Final reminder",
            body: opts.recoveryCoupon
              ? `We saved your cart one more time — and we're throwing in a one-time <strong>${opts.recoveryCoupon.discountPercent}% off</strong> code to bring you back. Stacks on top of our <strong>5% ACH discount</strong>, meaning bank-pay customers save roughly ${opts.recoveryCoupon.discountPercent + 5}% total. Code auto-applies when you click below.`
              : `We'll clear your saved cart in the next 24 hours. Our research-grade compounds ship cold-chain via UPS 2nd Day Air, free on orders over $200. Checking out with ACH saves you another <strong>${achSavingsFormatted}</strong>. This is the last email we'll send about this cart.`,
            cta: opts.recoveryCoupon ? "Claim my discount" : "Recover my cart",
          };

  // Recovery-code block — shown only on stage 3 when a code was minted.
  const couponBlockHtml = opts.recoveryCoupon
    ? `
      <div style="background:#FEF8EC;border:1px solid #E6D5B0;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:11px;color:#8B6914;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
          Your one-time recovery code
        </p>
        <p style="margin:0 0 8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;font-weight:700;color:#1a1a19;letter-spacing:2px;">
          ${opts.recoveryCoupon.code}
        </p>
        <p style="margin:0;font-size:12px;color:#666;">
          ${opts.recoveryCoupon.discountPercent}% off · Single use · Expires in 7 days
        </p>
      </div>
    `
    : "";

  const html = `
    <div style="${CART_EMAIL_STYLES.body}">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="${CART_EMAIL_STYLES.h1}">Based Research</h1>
        <p style="font-size: 12px; color: #999; letter-spacing: 1px; text-transform: uppercase;">Research-Grade Peptides</p>
      </div>
      <h2 style="${CART_EMAIL_STYLES.h2}">${content.heading}</h2>
      <p style="${CART_EMAIL_STYLES.p}">${content.body}</p>
      ${couponBlockHtml}
      ${itemsHtml}
      <div style="text-align: center; margin: 32px 0;">
        <a href="${cartUrl}" style="${CART_EMAIL_STYLES.button}">${content.cta}</a>
      </div>
      <p style="${CART_EMAIL_STYLES.p}">
        Every batch verified. Public COAs. Ships in 24 hours via UPS 2nd Day Air.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="${CART_EMAIL_STYLES.footer}">
        Based Research<br />
        For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.<br />
        <a href="${SITE_URL}/account" style="color: #999;">Manage email preferences</a>
      </p>
    </div>
  `;

  const itemSummary = opts.items.map((i) => `${i.productName} ${i.variantSize} × ${i.quantity}`).join("\n");

  await sendEmail({
    to: opts.email,
    subject: content.subject,
    meta: { template: `abandoned_cart_stage_${opts.stage}` },
    html,
    text: `${content.heading}\n\n${content.body}\n\n${itemSummary}\n\nSubtotal: $${(opts.subtotal / 100).toFixed(2)}\n\nRecover: ${cartUrl}`,
  });
}

// ──────────────────────────────────────────────────────────────────
// Refund confirmation
// ──────────────────────────────────────────────────────────────────
/**
 * Sent when admin issues a refund (full or partial) on an order. The
 * customer's bank statement timing differs by rail (cards: 3-5 biz
 * days, ACH: 5-10 biz days), so the body sets accurate expectations
 * and provides a reply path if the credit does not appear in window.
 *
 * Tone: scientific, factual, no apology unless the operator chose to
 * issue a goodwill refund (we surface the optional `note` field for
 * that). Voice convention: no em dashes, no curly quotes.
 */
interface RefundedLine {
  productName: string;
  variantSize: string;
  quantity: number;
  lineTotal: number; // cents (the refunded portion)
}

export async function sendRefundConfirmationEmail(opts: {
  email: string;
  firstName: string | null;
  orderNumber: string;
  refundCents: number;        // amount being refunded in this transaction
  originalTotalCents: number; // order total at time of capture
  alreadyRefundedCents: number; // cumulative prior refunds (excludes this one)
  paymentRail: "card" | "ach" | "other";
  refundedLines?: RefundedLine[]; // when partial; omit on full refunds
  note?: string | null;       // optional admin-supplied reason text
}) {
  const orderUrl = `${SITE_URL}/account/orders`;
  const refundUsd = `$${(opts.refundCents / 100).toFixed(2)}`;
  const remainingPaid = opts.originalTotalCents - opts.alreadyRefundedCents - opts.refundCents;
  const isFullRefund =
    opts.refundCents + opts.alreadyRefundedCents >= opts.originalTotalCents;

  const railWindow =
    opts.paymentRail === "card"
      ? "3 to 5 business days"
      : opts.paymentRail === "ach"
        ? "5 to 10 business days"
        : "5 to 10 business days";

  const linesTable = opts.refundedLines && opts.refundedLines.length > 0
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0 24px;">
        <tbody>
          ${opts.refundedLines
            .map(
              (l) => `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;">
                    <div style="color: #1a1a19; font-weight: 500;">${l.productName}</div>
                    <div style="color: #737373; font-size: 12px;">${l.variantSize} · Qty ${l.quantity}</div>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right; color: #1a1a19; font-weight: 500;">
                    $${(l.lineTotal / 100).toFixed(2)}
                  </td>
                </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `
    : "";

  const html = `
    <div style="${CART_EMAIL_STYLES.body}">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="${CART_EMAIL_STYLES.h1}">Based Research</h1>
      </div>
      <h2 style="${CART_EMAIL_STYLES.h2}">Refund processed</h2>
      <p style="${CART_EMAIL_STYLES.p}">
        Hello ${opts.firstName || "there"},
      </p>
      <p style="${CART_EMAIL_STYLES.p}">
        We have processed a refund of <strong style="color:#1a1a19;">${refundUsd}</strong>
        on order <strong style="color:#1a1a19;">${opts.orderNumber}</strong>.
        ${isFullRefund
          ? "This refund covers the full remaining balance on the order."
          : "This is a partial refund. The remainder of the order is unchanged."}
      </p>

      ${opts.note ? `<p style="${CART_EMAIL_STYLES.p}">Note from our team: ${opts.note}</p>` : ""}

      ${linesTable}

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
        <tbody>
          <tr>
            <td style="padding: 6px 0; color: #737373;">Original order total</td>
            <td style="padding: 6px 0; text-align: right; color: #1a1a19; font-variant-numeric: tabular-nums;">
              $${(opts.originalTotalCents / 100).toFixed(2)}
            </td>
          </tr>
          ${opts.alreadyRefundedCents > 0
            ? `<tr>
                <td style="padding: 6px 0; color: #737373;">Previously refunded</td>
                <td style="padding: 6px 0; text-align: right; color: #1a1a19; font-variant-numeric: tabular-nums;">
                  $${(opts.alreadyRefundedCents / 100).toFixed(2)}
                </td>
              </tr>`
            : ""}
          <tr>
            <td style="padding: 6px 0; color: #1a1a19; font-weight: 600;">This refund</td>
            <td style="padding: 6px 0; text-align: right; color: #1a1a19; font-weight: 600; font-variant-numeric: tabular-nums;">
              ${refundUsd}
            </td>
          </tr>
          ${remainingPaid > 0
            ? `<tr>
                <td style="padding: 6px 0; color: #737373;">Remaining paid balance</td>
                <td style="padding: 6px 0; text-align: right; color: #1a1a19; font-variant-numeric: tabular-nums;">
                  $${(remainingPaid / 100).toFixed(2)}
                </td>
              </tr>`
            : ""}
        </tbody>
      </table>

      <p style="${CART_EMAIL_STYLES.p}">
        The refund was issued to the original payment method. Expected appearance on your
        statement: <strong style="color:#1a1a19;">${railWindow}</strong>. If the credit does not
        post within that window, reply to this email with your bank&rsquo;s transaction reference
        and we will trace it on our side.
      </p>

      <div style="text-align: center; margin: 24px 0 32px;">
        <a href="${orderUrl}" style="${CART_EMAIL_STYLES.button}">View order details</a>
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="${CART_EMAIL_STYLES.footer}">
        Based Research<br />
        For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.<br />
        Questions about this refund? Reply to this email or contact support@basedresearch.com.
      </p>
    </div>
  `;

  const text =
    `Refund processed.\n\n` +
    `Order: ${opts.orderNumber}\n` +
    `Refund amount: ${refundUsd}\n` +
    `Original total: $${(opts.originalTotalCents / 100).toFixed(2)}\n` +
    (opts.alreadyRefundedCents > 0
      ? `Previously refunded: $${(opts.alreadyRefundedCents / 100).toFixed(2)}\n`
      : "") +
    (remainingPaid > 0
      ? `Remaining paid balance: $${(remainingPaid / 100).toFixed(2)}\n`
      : "") +
    `\nExpected on your statement within ${railWindow}.\n` +
    `Order details: ${orderUrl}`;

  await sendEmail({
    to: opts.email,
    subject: `Refund processed for order ${opts.orderNumber}`,
    meta: { template: "refund_confirmation" },
    html,
    text,
  });
}

// ──────────────────────────────────────────────────────────────────
// 60-day win-back nudge
// ──────────────────────────────────────────────────────────────────
/**
 * Sent to customers whose last paid order shipped roughly 60 days ago
 * (the cron window is 55-75 days). Frames the reminder around the
 * supplier-recommended reconstituted-vial use-window (21-28 days at
 * 2-8 °C) so it reads as scientific and operationally useful rather
 * than a generic marketing nudge.
 *
 * The cron updates `users.last_winback_email_at` on send to enforce a
 * 90-day TTL. Customers who place a new order before the next firing
 * naturally fall out of the eligibility window.
 *
 * Voice: no em dashes, factual, RUO framing preserved.
 */
interface WinBackItem {
  productName: string;
  variantSize: string;
  variantSku: string;
  quantity: number;
  slug: string;
}

export async function sendWinBackEmail(opts: {
  email: string;
  firstName: string | null;
  lastOrderShippedAt: Date;
  daysSinceLastOrder: number;
  lastOrderItems: WinBackItem[];
}) {
  const reorderUrl = `${SITE_URL}/cart?reorder=${opts.lastOrderItems
    .map((i) => `${i.variantSku}:${i.quantity}`)
    .join(",")}`;
  const shippedDate = opts.lastOrderShippedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemsHtml = opts.lastOrderItems
    .map(
      (i) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;">
            <a href="${SITE_URL}/product/${i.slug}" style="color: #1a1a19; text-decoration: none; font-weight: 500;">${i.productName}</a>
            <div style="color: #737373; font-size: 12px;">${i.variantSize} · Qty ${i.quantity}</div>
          </td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="${CART_EMAIL_STYLES.body}">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="${CART_EMAIL_STYLES.h1}">Based Research</h1>
      </div>

      <h2 style="${CART_EMAIL_STYLES.h2}">Approaching the reorder window</h2>

      <p style="${CART_EMAIL_STYLES.p}">
        Hello ${opts.firstName || "there"},
      </p>

      <p style="${CART_EMAIL_STYLES.p}">
        Your last order from Based Research shipped on
        <strong style="color:#1a1a19;">${shippedDate}</strong>,
        approximately ${opts.daysSinceLastOrder} days ago.
      </p>

      <p style="${CART_EMAIL_STYLES.p}">
        For most reconstituted lyophilized peptides stored at 2 to 8 &deg;C, the
        supplier-recommended use window is 21 to 28 days post-reconstitution. If your
        research is ongoing, your prior batch is likely outside that window now and a
        fresh batch may be warranted.
      </p>

      <div style="background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px; font-size: 11px; color: #737373; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
          Your last order
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>

      <p style="${CART_EMAIL_STYLES.p}">
        The button below pre-loads the same items into your cart. Every batch is independently
        HPLC purity-verified by an A2LA-accredited lab and ships within 24 hours via UPS 2nd Day Air.
      </p>

      <div style="text-align: center; margin: 24px 0 32px;">
        <a href="${reorderUrl}" style="${CART_EMAIL_STYLES.button}">Reorder the same batch</a>
      </div>

      <p style="font-size: 13px; color: #999; line-height: 1.5; margin-top: 24px;">
        If you no longer need a fresh batch, no action is required. We will not send another
        reorder reminder for this order.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="${CART_EMAIL_STYLES.footer}">
        Based Research<br />
        For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.<br />
        <a href="${SITE_URL}/account" style="color: #999;">Manage email preferences</a>
      </p>
    </div>
  `;

  const text =
    `Your last Based Research order shipped on ${shippedDate}, ` +
    `approximately ${opts.daysSinceLastOrder} days ago.\n\n` +
    `For reconstituted lyophilized peptides stored at 2 to 8 C, ` +
    `the supplier-recommended use window is 21 to 28 days post-reconstitution. ` +
    `Your prior batch is likely outside that window now.\n\n` +
    `Last order:\n` +
    opts.lastOrderItems
      .map((i) => `- ${i.productName} ${i.variantSize} x${i.quantity}`)
      .join("\n") +
    `\n\nReorder the same batch: ${reorderUrl}`;

  await sendEmail({
    to: opts.email,
    subject: "Approaching the reorder window for your last batch",
    meta: { template: "winback_60d" },
    html,
    text,
  });
}

// ──────────────────────────────────────────────────────────────────
// Affiliate application: approval
// ──────────────────────────────────────────────────────────────────
/**
 * Fired when admin moves an affiliate application from `inactive` to
 * `active` via PATCH /api/admin/affiliates. Communicates the code,
 * dashboard link, attribution model, and content guardrails up front
 * so partners do not need a follow-up onboarding call to start
 * promoting compliantly.
 *
 * Voice: business-formal, scientific. No em dashes. The commission
 * rate is intentionally NOT included (we keep that off the public
 * landing page and out of mass communications; partners see it on
 * their dashboard).
 */
export async function sendAffiliateApprovalEmail(opts: {
  email: string;
  firstName: string | null;
  affiliateCode: string;
  payoutMethod: "crypto" | "ach";
  // Optional per-affiliate checkout-discount override. When NULL or
  // omitted, the email omits the explicit discount line and the
  // partner gets the global default rate (which we do not name in
  // copy to avoid pinning ourselves to a public rate).
  customerDiscountPercent?: number | null;
}) {
  const dashboardUrl = `${SITE_URL}/affiliate/dashboard`;
  const referralUrl = `${SITE_URL}/?ref=${opts.affiliateCode}`;
  const payoutLine =
    opts.payoutMethod === "crypto"
      ? "USDT/USDC (ERC-20 or TRC-20) on a monthly cadence."
      : "ACH bank transfer on a monthly cadence.";
  const discountPct = opts.customerDiscountPercent ?? null;

  const html = `
    <div style="${CART_EMAIL_STYLES.body}">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="${CART_EMAIL_STYLES.h1}">Based Research</h1>
      </div>

      <h2 style="${CART_EMAIL_STYLES.h2}">Your partner application has been approved</h2>

      <p style="${CART_EMAIL_STYLES.p}">
        Hello ${opts.firstName || "there"},
      </p>

      <p style="${CART_EMAIL_STYLES.p}">
        Thank you for applying to the Based Research Partner Program. After reviewing
        your application, we are pleased to invite you to join.
      </p>

      <div style="background: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            <tr>
              <td style="padding: 8px 0; color: #737373; width: 38%;">Affiliate code</td>
              <td style="padding: 8px 0; color: #1a1a19; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-weight: 600;">
                ${opts.affiliateCode}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #737373;">Referral link</td>
              <td style="padding: 8px 0; color: #1a1a19; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; word-break: break-all;">
                ${referralUrl}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #737373;">Attribution</td>
              <td style="padding: 8px 0; color: #1a1a19;">Lifetime, no cookie window</td>
            </tr>
            ${discountPct != null
              ? `<tr>
                  <td style="padding: 8px 0; color: #737373;">Customer discount</td>
                  <td style="padding: 8px 0; color: #1a1a19;">${discountPct}% off when they use your code or click your link</td>
                </tr>`
              : ""}
            <tr>
              <td style="padding: 8px 0; color: #737373;">Payout</td>
              <td style="padding: 8px 0; color: #1a1a19;">${payoutLine}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="${CART_EMAIL_STYLES.p}">
        A few notes for any promotional content you produce:
      </p>

      <ol style="font-size: 14px; color: #1a1a19; line-height: 1.7; padding-left: 20px; margin-bottom: 24px;">
        <li style="margin-bottom: 10px;">
          Based Research sells research-grade compounds for in-vitro research only.
          Promotional copy must reflect this framing. Do not make human-dosing or medical
          claims in writing. Verbal conversations with educated audiences may have more
          latitude; written records do not.
        </li>
        <li style="margin-bottom: 10px;">
          We can provide batch-specific Certificates of Analysis, supplier specifications,
          and HPLC purity reports on request for any compound you cover. Reach out before
          you publish if you want a primary-source citation.
        </li>
        <li style="margin-bottom: 10px;">
          Your dashboard tracks clicks, signups, conversions, and accrued commissions in
          real time. Payouts are processed at the end of each calendar month for any
          balance above the minimum threshold.
        </li>
      </ol>

      <div style="text-align: center; margin: 24px 0 32px;">
        <a href="${dashboardUrl}" style="${CART_EMAIL_STYLES.button}">Open your partner dashboard</a>
      </div>

      <p style="${CART_EMAIL_STYLES.p}">
        Questions about the program, your account, or content collaboration? Reply to this
        email and a member of the partnerships team will respond within one business day.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="${CART_EMAIL_STYLES.footer}">
        Based Research<br />
        For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.
      </p>
    </div>
  `;

  const text =
    `Your Based Research Partner Program application has been approved.\n\n` +
    `Affiliate code: ${opts.affiliateCode}\n` +
    `Referral link: ${referralUrl}\n` +
    `Attribution: lifetime, no cookie window\n` +
    (discountPct != null
      ? `Customer discount: ${discountPct}% off when they use your code or click your link\n`
      : "") +
    `Payout: ${payoutLine}\n\n` +
    `Open your dashboard: ${dashboardUrl}\n\n` +
    `Notes for promotional content:\n` +
    `1. Research-grade compounds for in-vitro research only. No human-dosing or medical claims in writing.\n` +
    `2. We provide batch-specific COAs and HPLC reports on request.\n` +
    `3. Payouts processed at the end of each calendar month above the minimum threshold.\n\n` +
    `Questions? Reply to this email.`;

  await sendEmail({
    to: opts.email,
    subject: "Your Based Research partner application has been approved",
    meta: { template: "affiliate_approval" },
    html,
    text,
  });
}

// ──────────────────────────────────────────────────────────────────
// Affiliate application: decline
// ──────────────────────────────────────────────────────────────────
/**
 * Fired when admin declines a partner application. The body avoids
 * personal critique and frames the decision around audience-fit and
 * cohort capacity, which is true and leaves the door open for future
 * reapplication. No commission rate or payout details are mentioned;
 * those live behind the application gate by design.
 */
export async function sendAffiliateRejectionEmail(opts: {
  email: string;
  firstName: string | null;
}) {
  const affiliateUrl = `${SITE_URL}/affiliate`;

  const html = `
    <div style="${CART_EMAIL_STYLES.body}">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="${CART_EMAIL_STYLES.h1}">Based Research</h1>
      </div>

      <h2 style="${CART_EMAIL_STYLES.h2}">Update on your partner application</h2>

      <p style="${CART_EMAIL_STYLES.p}">
        Hello ${opts.firstName || "there"},
      </p>

      <p style="${CART_EMAIL_STYLES.p}">
        Thank you for applying to the Based Research Partner Program and for taking the
        time to share details about your audience and your work.
      </p>

      <p style="${CART_EMAIL_STYLES.p}">
        After reviewing your application, we are not able to extend a partnership at this
        time. We keep the program small and selective so each partner can be supported well,
        and the fit between your current audience composition and our research-compounds
        catalog was not strong enough for us to commit in the present cohort.
      </p>

      <p style="${CART_EMAIL_STYLES.p}">
        This is not a reflection of the quality of your work. Many qualified applicants do not
        match our specific niche on a given review cycle. If your audience focus or content
        direction shifts in a way that makes us a stronger fit, we are always open to
        reconsidering. You can reapply at any time.
      </p>

      <div style="text-align: center; margin: 24px 0 32px;">
        <a href="${affiliateUrl}" style="${CART_EMAIL_STYLES.button}">Visit the partner program</a>
      </div>

      <p style="${CART_EMAIL_STYLES.p}">
        Thank you again for your interest. We wish you success in your work.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="${CART_EMAIL_STYLES.footer}">
        Based Research<br />
        For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.
      </p>
    </div>
  `;

  const text =
    `Update on your Based Research partner application.\n\n` +
    `Thank you for applying. After review, we are not able to extend a partnership at this time. ` +
    `The program is small and selective, and the fit between your current audience and our ` +
    `research-compounds catalog was not strong enough for the present cohort.\n\n` +
    `This is not a reflection of the quality of your work. If your audience focus shifts in a way ` +
    `that makes us a stronger fit, you can reapply any time at ${affiliateUrl}.\n\n` +
    `Thank you again for your interest.`;

  await sendEmail({
    to: opts.email,
    subject: "Update on your Based Research partner application",
    meta: { template: "affiliate_decline" },
    html,
    text,
  });
}

