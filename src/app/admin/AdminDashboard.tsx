"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { formatPriceShort } from "@/lib/utils";
import { computeOrderProfit } from "@/lib/profit";
import { businessTypeLabel } from "@/lib/business-types";
import LiveTrafficWidget from "@/components/admin/LiveTrafficWidget";
import CreateManualOrderModal from "@/components/admin/CreateManualOrderModal";
import {
  Package,
  Users,
  DollarSign,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plus,
  LayoutDashboard,
  ShoppingBag,
  RefreshCw,
  LogOut,
  AlertCircle,
  Building2,
  Link2,
  Settings,
  TrendingUp,
  CreditCard,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  BarChart3,
  Inbox,
  Loader2,
  Sparkles,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import CashFlowTab from "@/components/admin/CashFlowTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import BumpStatsCard from "@/components/admin/BumpStatsCard";
import OutboxTab from "@/components/admin/OutboxTab";
import HighValueFollowupTab from "@/components/admin/HighValueFollowupTab";
import CoasTab from "@/components/admin/CoasTab";

type Tab = "overview" | "orders" | "hvFollowup" | "users" | "messages" | "cashFlow" | "analytics" | "outbox" | "wholesale" | "affiliates" | "coas" | "settings";

// Readable labels for the checkout "department at research institution"
// picker (values set in src/app/checkout/CheckoutClient.tsx DEPARTMENT_OPTIONS).
const DEPARTMENT_LABELS: Record<string, string> = {
  rnd: "Research & Development (R&D)",
  lab_ops: "Laboratory / Lab Operations",
  qc_qa: "Quality Control / Quality Assurance",
  clinical_research: "Clinical Research",
  biochemistry: "Biochemistry",
  pharmacology: "Pharmacology / Toxicology",
  academic: "Academic / University",
  procurement: "Procurement / Purchasing",
  other: "Other",
};

interface WholesaleAccount {
  id: string; companyName: string; userName: string; userEmail: string;
  institutionType: string; estimatedMonthlyVolume: string | null;
  status: string; tier: number; discountPercent: number;
  creditTerms: string; outstandingBalance: number; createdAt: string;
}

interface AffiliateRow {
  id: string; affiliateCode: string; userName: string; userEmail: string;
  userPhone: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  applicationNotes: string | null;
  commissionRate: string; totalEarned: number; totalPaid: number;
  referralCount: number; clickCount: number; clickConversionPct: number | null;
  pendingBalance: number; status: string; createdAt: string;
}

interface Stats {
  totalUsers: number;
  newUsersToday?: number;
  newUsers7d?: number;
  totalOrders: number;
  recentOrders: number;
  revenue30d: number;
  revenue7d?: number;
  revenueToday?: number;
  revenueYesterday?: number;
  ordersToday?: number;
  ordersYesterday?: number;
  aov30d?: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  flaggedOrders?: number;
  stuckOrders?: number;
  paidCount30d?: number;
  paidRevenue30d?: number;
  subsActive?: number;
  subsPaused?: number;
  subsPaymentFailed?: number;
  subsCancelled?: number;
  subsMrrCents?: number;
  subsDueThisWeek?: number;
  // Profit — gross margin on goods sold (revenue from completed orders
  // minus per-SKU COGS). Doesn't subtract shipping/processing fees.
  profitTodayCents?: number;
  cogsTodayCents?: number;
  revenueTodayPaidCents?: number;
  profitTodayHasMissingCost?: boolean;
  profit30dCents?: number;
  cogs30dCents?: number;
  revenue30dPaidCents?: number;
  // Month-to-date — calendar month, paid orders only
  revenueMtdCents?: number;
  ordersMtd?: number;
  profitMtdCents?: number;
  cogsMtdCents?: number;
  revenueMtdPaidCents?: number;
  profitMtdHasMissingCost?: boolean;
  // Comparison windows
  profitYesterdayCents?: number;
  cogsYesterdayCents?: number;
  revenueYesterdayPaidCents?: number;
  profitYesterdayHasMissingCost?: boolean;
  revenuePriorMtdCents?: number;
  profitPriorMtdCents?: number;
  // Abandoned-cart recovery candidates
  recoveryValueCents?: number;
  recoveryCount?: number;
  // Refund visibility (paired with revenue30d for refund-rate %)
  refundedTodayCents?: number;
  refunded30dCents?: number;
  // AOV trend (current 30d already in aov30d; prior is for delta)
  aovPrior30dCents?: number;
  revenuePrior30dCents?: number;
  ordersPrior30d?: number;
  // Subscription health (last 30d)
  subsNew30d?: number;
  subsChurned30d?: number;
  subsChurnRate30d?: number;
}

interface RevenueDay {
  day: string;
  revenue: number;
  orderCount: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  cogs?: number;
  profit?: number;
  marginPct?: number | null;
  hasMissingCost?: boolean;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  email: string;
  // Captured at order creation on every flow (express guest, gated, manual).
  // Optional because legacy rows pre-dating the customer_phone column may
  // be null.
  customerPhone?: string | null;
  total: number;
  status: string;
  paymentStatus?: string | null;
  paymentGateway: string | null;
  createdAt: string;
}

interface ShipStationPoll {
  lastPollAt: string | null;
  lastPollOrderCount: number | null;
  pollCount24h: number;
}

interface InFlightShipment {
  id: string;
  orderNumber: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  trackingCarrier: string | null;
  trackingMilestone: string | null;
  recipient: string | null;
  state: string | null;
  createdAt: string;
}

interface StatsPayload {
  stats: Stats | null;
  revenueByDay: RevenueDay[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  shipStationPoll?: ShipStationPoll;
  inFlightShipments?: InFlightShipment[];
}

interface OrderLineItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  variantSku: string;
  variantSize: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  email: string;
  customerPhone?: string | null;
  status: string;
  subtotal: number;
  shippingCost: number;
  discount?: number;
  total: number;
  // Tracking
  trackingNumber: string | null;
  trackingUrl?: string | null;
  trackingCarrier?: string | null;
  trackingSynced?: boolean | null;
  trackingMilestone?: string | null;
  trackingLastEvent?: string | null;
  trackingLastChecked?: string | null;
  deliveredAt?: string | null;
  // ShipStation
  shipstationOrderId?: number | null;
  shipstationOrderKey?: string | null;
  shipstationPushedAt?: string | null;
  // Payment
  paymentStatus?: string | null;
  paymentGateway?: string | null;
  // Provider charge/transaction id, once a payment processor is wired.
  paymentReference?: string | null;
  // Cumulative refunds applied to this order (in cents).
  refundedAmountCents?: number | null;
  couponCode?: string | null;
  // Fraud
  fraudScore?: number | null;
  fraudSignals?: string[] | null;
  // Misc
  notes: string | null;
  subscriptionId?: string | null;
  userId?: string | null;
  // Institutional buyer verification (null = not yet verified). Joined
  // from the users table in /api/admin/orders.
  institutionVerifiedAt?: string | null;
  items?: OrderLineItem[];
  // Duplicate-order detection. When set, this order is the newer of
  // two back-to-back paid orders (within 5 min) that have identical
  // line-item contents — likely an accidental double-submit. Surfaces
  // in the UI as a "Possible duplicate" priority pill.
  dupOfOrderId?: string | null;
  dupConfirmationSmsSentAt?: string | null;
  // Admin thank-you outreach idempotency. Stamped when admin clicks
  // the "Send thank-you" button (which opens iMessage pre-populated).
  thankYouSmsSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    companyName?: string;
    companyEmail?: string;
    department?: string;
  } | null;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  orderNumber: string | null;
  message: string;
  status: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  signupIp: string | null;
  signupCountry: string | null;
  signupRegion: string | null;
  signupCity: string | null;
  createdAt: string;
  // Aggregated from orders + abandoned_carts on the server. Sorted
  // purchased-first, then alphabetical. Max of ~20 entries per user
  // (we don't truncate server-side; the UI shows first N with +more).
  interests: Array<{ slug: string; name: string; purchased: boolean }>;
  // First-touch acquisition pulled from the customer's earliest
  // completed order. Null for leads (no completed orders yet).
  // Captured from UTM params / referrer / landing path at first
  // session; persisted at checkout. See /api/admin/users/route.ts.
  acquisition: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    referrerDomain: string | null;
    landingPath: string | null;
    firstOrderAt: string;
  } | null;
  // Business identifiers captured at signup (2026-05-21). companyName +
  // businessType are plain; EIN is encrypted at rest so the list endpoint
  // only returns a presence flag.
  companyName: string | null;
  businessType: string | null;
  hasEin: boolean;
}

/**
 * Default outreach message the operator sends from the Customers tab.
 * Templated on first name; collapses cleanly when name is null so
 * we don't send "Howdy , this is the operator..." with an awkward gap.
 */
function buildOutreachSms(firstName: string | null): string {
  const greeting = firstName ? `Howdy ${firstName}, ` : "Howdy, ";
  return `${greeting}this is the team at Based Research. Let me know if you have any questions about our catalog.`;
}

/** Key stored in admin_outreach.template_key — bump when the copy changes. */
const OUTREACH_TEMPLATE_KEY = "intro_v1";

/**
 * Click handler: fire the audit log, then hand off to Messages.app via
 * the sms: URL scheme. We don't await the log call — if PostHog / DB is
 * slow, Messages still opens instantly. The `?&body=` separator is the
 * iOS-safe variant; Android + macOS both accept it.
 */
function handleOutreachClick(customer: { id: string; phone: string; firstName: string | null }) {
  // Audit + analytics (non-blocking)
  fetch(`/api/admin/customers/${customer.id}/outreach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "sms", templateKey: OUTREACH_TEMPLATE_KEY }),
    keepalive: true,
  }).catch((err) => console.warn("[admin-outreach] log failed", err));

  const body = buildOutreachSms(customer.firstName);
  // URL-encode the body. + signs in the phone survive.
  const url = `sms:${customer.phone}?&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

/**
 * Cart-abandonment SMS — different angle than the cold outreach above.
 * The customer already filled out the express checkout form (so they're
 * warm) but bounced before paying. Lead with their first name + a soft
 * nudge to come back. No discount in v1; if conversion is low the operator can
 * add a code line later.
 */
function buildAbandonSms(firstName: string | null): string {
  const greeting = firstName ? `Hey ${firstName}, ` : "Hey, ";
  return `${greeting}this is the team at Based Research. Saw your cart didn't finish — anything I can help with? Happy to answer questions or send a fresh checkout link.`;
}

function handleAbandonTextClick(opts: { phone: string; firstName: string | null }) {
  const body = buildAbandonSms(opts.firstName);
  const url = `sms:${opts.phone}?&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

/**
 * Compact pill row showing what a customer has purchased (filled pill)
 * or added to their cart without buying (outlined pill). Collapses to a
 * `+N more` chip when the list exceeds MAX_VISIBLE; expanded view shows
 * everything. Purchased items always lead.
 */
const MAX_VISIBLE_INTERESTS = 4;

function CustomerInterests({
  interests,
}: {
  interests: AdminUser["interests"];
}) {
  const [expanded, setExpanded] = useState(false);
  if (!interests || interests.length === 0) {
    return <span className="text-xs text-muted/50">—</span>;
  }
  const visible = expanded ? interests : interests.slice(0, MAX_VISIBLE_INTERESTS);
  const hiddenCount = interests.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visible.map((item) => (
        <a
          key={item.slug}
          href={`/product/${item.slug}`}
          target="_blank"
          rel="noreferrer"
          title={item.purchased ? "Purchased" : "Added to cart but didn't buy"}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
            item.purchased
              ? "bg-success/10 text-success hover:bg-success/15"
              : "bg-accent text-foreground/80 border border-border hover:bg-accent/80"
          }`}
        >
          {item.purchased && <span className="text-[9px]" aria-hidden="true">✓</span>}
          <span className="truncate max-w-[140px]">{item.name}</span>
        </a>
      ))}
      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-[11px] text-muted hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          +{hiddenCount} more
        </button>
      )}
      {expanded && interests.length > MAX_VISIBLE_INTERESTS && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[11px] text-muted hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          collapse
        </button>
      )}
    </div>
  );
}

/**
 * First-touch acquisition pill for the Customers tab.
 *
 * Renders the highest-signal field we have:
 *   1. utm_source (paid + tagged campaigns)        → "META", "GOOGLE", etc.
 *   2. referrer_domain (organic / social referral)  → "FACEBOOK.COM"
 *   3. landing_path (organic, no UTM, no referrer)  → "DIRECT → /product/bpc-157"
 *   4. nothing                                       → "—"  (lead, no order yet)
 *
 * The pill color is keyed by the source so the eye can scan the customer
 * list and spot channel mix at a glance. Hover for full details (medium,
 * campaign, content, landing page, referrer, first-order date).
 */
function CustomerSource({
  acquisition,
}: {
  acquisition: AdminUser["acquisition"];
}) {
  if (!acquisition) {
    return (
      <span
        className="text-xs text-muted/50"
        title="Lead — no completed order yet, so no acquisition data captured"
      >
        —
      </span>
    );
  }

  // Pick the most specific signal available, and build the tooltip.
  const sourceRaw =
    acquisition.source ??
    acquisition.referrerDomain ??
    (acquisition.landingPath ? "direct" : null);
  if (!sourceRaw) return <span className="text-xs text-muted/50">—</span>;

  // Normalize source for color keying.
  const s = sourceRaw.toLowerCase();
  let colorClass = "bg-accent text-muted";
  if (s.includes("meta") || s.includes("facebook") || s.includes("instagram") || s.includes("fb")) {
    colorClass = "bg-[#1877F2]/10 text-[#1877F2]";
  } else if (s.includes("google") || s.includes("youtube") || s.includes("yt") || s.includes("adwords")) {
    colorClass = "bg-[#EA4335]/10 text-[#EA4335]";
  } else if (s.includes("tiktok")) {
    colorClass = "bg-foreground/10 text-foreground";
  } else if (s.includes("twitter") || s.includes("x.com")) {
    colorClass = "bg-foreground/10 text-foreground";
  } else if (s.includes("email") || s.includes("klaviyo") || s.includes("mailchimp") || s.includes("newsletter")) {
    colorClass = "bg-success/10 text-success";
  } else if (s.includes("affiliate") || s.includes("partner")) {
    colorClass = "bg-warm/10 text-warm";
  } else if (s.includes("reddit")) {
    colorClass = "bg-[#FF4500]/10 text-[#FF4500]";
  } else if (s === "direct" || s.includes("untagged")) {
    colorClass = "bg-accent text-muted";
  } else if (acquisition.source) {
    // Any tagged source we don't have a brand color for gets the primary tint.
    colorClass = "bg-primary/10 text-primary";
  }

  // Tooltip: full breadcrumb of what we know.
  const tooltipLines: string[] = [];
  if (acquisition.source) tooltipLines.push(`utm_source: ${acquisition.source}`);
  if (acquisition.medium) tooltipLines.push(`utm_medium: ${acquisition.medium}`);
  if (acquisition.campaign) tooltipLines.push(`utm_campaign: ${acquisition.campaign}`);
  if (acquisition.content) tooltipLines.push(`utm_content: ${acquisition.content}`);
  if (acquisition.referrerDomain) tooltipLines.push(`referrer: ${acquisition.referrerDomain}`);
  if (acquisition.landingPath) tooltipLines.push(`landed on: ${acquisition.landingPath}`);
  if (acquisition.firstOrderAt) {
    try {
      const d = new Date(acquisition.firstOrderAt);
      tooltipLines.push(`captured: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    } catch { /* skip if unparseable */ }
  }
  const tooltip = tooltipLines.join("\n") || "First-touch acquisition";

  // Visible label: short source, optionally with medium suffix.
  let label = sourceRaw.toUpperCase();
  if (acquisition.medium && acquisition.source) {
    // e.g. "META · CPC"
    label = `${acquisition.source.toUpperCase()} · ${acquisition.medium.toUpperCase()}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide whitespace-nowrap ${colorClass}`}
      title={tooltip}
    >
      {label}
    </span>
  );
}

/**
 * Smart joined-at format for the customers table:
 *   - Today: "Today, 7:14 PM"
 *   - Yesterday: "Yesterday, 7:14 PM"
 *   - This year: "Apr 24, 7:14 PM"
 *   - Older: "Apr 24, 2025, 7:14 PM"
 * Returns both a display string and an absolute ISO tooltip so admins can
 * confirm the exact server time on hover.
 */
function formatJoinedAt(iso: string): { display: string; absolute: string } {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  let display: string;
  if (sameDay) display = `Today, ${time}`;
  else if (isYesterday) display = `Yesterday, ${time}`;
  else if (sameYear) {
    display = `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
  } else {
    display = `${d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}, ${time}`;
  }
  return {
    display,
    absolute: d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }),
  };
}

/** Format a stored E.164 phone for humans: +14058801465 → (405) 880-1465. */
function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // US-style 10-digit (with or without leading 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Anything else (international, short-code, etc.) — return verbatim
  return phone;
}

// ISO 3166-1 alpha-2 → emoji flag
function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  const offset = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + code.toUpperCase().charCodeAt(0) - offset,
    A + code.toUpperCase().charCodeAt(1) - offset
  );
}

function formatLocation(u: AdminUser): string {
  const parts: string[] = [];
  if (u.signupCity) parts.push(u.signupCity);
  if (u.signupRegion) parts.push(u.signupRegion);
  if (u.signupCountry) parts.push(u.signupCountry);
  return parts.length ? parts.join(", ") : "—";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  // Synthetic status — applied client-side via getDisplayStatus() to
  // pending orders that are old enough to clearly have been abandoned
  // mid-checkout (no payment ever cleared). Distinct rust-colored chip
  // so it's instantly distinguishable from genuine still-paying pending.
  abandoned: { label: "Abandoned cart", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  // Synthetic — declined/failed payment (status='cancelled' + paymentStatus='failed').
  // Distinct from a genuine cancellation so the operator can tell a card
  // decline apart from an order someone actually cancelled.
  failed: { label: "Payment failed", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  confirmed: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  processing: { label: "Processing", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  shipped: { label: "Shipped", color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
  delivered: { label: "Delivered", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  refunded: { label: "Refunded", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
};

// Threshold at which a pending order becomes "abandoned" for display
// purposes. 15 min covers normal payment round-trips (hosted-checkout
// redirects, 3DS challenges, form filling) — any pending order older
// than this almost certainly didn't finish paying. Tweak if we ever see
// genuine pending stretches longer than 15 min.
const ABANDONED_AFTER_MS = 15 * 60 * 1000;

// Translates raw order state (status + paymentStatus + age) into the
// display-only status used for the badge. Genuine "pending"-status
// orders that have aged out flip to "abandoned" so the admin can scan
// the list and see which carts went unconverted vs which are actively
// paying right now.
function getDisplayStatus(o: { status: string; paymentStatus?: string | null; createdAt: string }): string {
  // A stale checkout the cleanup cron auto-closed (it sets BOTH status and
  // paymentStatus to 'cancelled') is an abandoned cart, not a real
  // cancellation. paymentStatus='cancelled' is the unique fingerprint —
  // nothing else writes it.
  if (o.status === "cancelled" && o.paymentStatus === "cancelled") return "abandoned";
  // A declined/failed payment is a failed checkout, not a cancellation.
  if (o.status === "cancelled" && o.paymentStatus === "failed") return "failed";
  if (o.status !== "pending") return o.status;
  // payment_status='completed' on a status='pending' row would be weird,
  // but handle it: that's an order whose payment cleared and is just
  // waiting for fulfillment-state transition. Don't call it abandoned.
  if (o.paymentStatus === "completed") return o.status;
  const age = Date.now() - new Date(o.createdAt).getTime();
  if (age >= ABANDONED_AFTER_MS) return "abandoned";
  return o.status;
}

// Full date + time formatter for order rows. The user wants to see the
// exact moment a checkout was attempted (not just "4/29/2026") so we
// can tell same-day attempts apart, see clusters of abandons, etc.
function formatOrderDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [inFlightShipments, setInFlightShipments] = useState<InFlightShipment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [shipStationPoll, setShipStationPoll] = useState<ShipStationPoll | null>(null);
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  // Default to "paid" so the Orders tab opens to actual revenue —
  // abandoned carts have their own filter + Recovery $$ widget on the
  // Overview tab. The old "all" default buried real orders under days
  // of unpaid pendings.
  const [orderFilter, setOrderFilter] = useState("paid");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [wholesaleAccounts, setWholesaleAccounts] = useState<WholesaleAccount[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = (await res.json()) as StatsPayload;
        setStats(data.stats);
        if (Array.isArray(data.revenueByDay)) setRevenueByDay(data.revenueByDay);
        if (Array.isArray(data.topProducts)) setTopProducts(data.topProducts);
        if (Array.isArray(data.recentOrders)) setRecentOrders(data.recentOrders);
        if (Array.isArray(data.inFlightShipments)) setInFlightShipments(data.inFlightShipments);
        if (data.shipStationPoll) setShipStationPoll(data.shipStationPoll);
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orderFilter !== "all") params.set("status", orderFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/admin/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) { console.error(err); }
  }, [orderFilter, searchQuery]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) { console.error(err); }
  }, [searchQuery]);

  const fetchWholesale = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/wholesale");
      if (res.ok) { const data = await res.json(); setWholesaleAccounts(data.accounts); }
    } catch (err) { console.error(err); }
  }, []);

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/affiliates");
      if (res.ok) { const data = await res.json(); setAffiliates(data.affiliates); }
    } catch (err) { console.error(err); }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/admin/contact?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) { console.error(err); }
  }, [searchQuery]);

  // Per-tab fetch — stats only fire on Overview (or explicitly when an
  // order/state mutation happens elsewhere via the patch flows below).
  // Previously refetched stats on every tab change which was wasteful;
  // the data they back is only displayed on the Overview page.
  const [statsLastFetchedAt, setStatsLastFetchedAt] = useState<number | null>(null);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      tab === "overview" ? fetchStats().then(() => setStatsLastFetchedAt(Date.now())) : Promise.resolve(),
      tab === "orders" ? fetchOrders() : Promise.resolve(),
      tab === "users" ? fetchUsers() : Promise.resolve(),
      tab === "wholesale" ? fetchWholesale() : Promise.resolve(),
      tab === "affiliates" ? fetchAffiliates() : Promise.resolve(),
      tab === "messages" ? fetchMessages() : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [tab, fetchStats, fetchOrders, fetchUsers, fetchWholesale, fetchAffiliates, fetchMessages]);

  // Background refresh on the Overview tab — every 60 seconds, silently
  // re-pull stats so the dashboard reflects new orders / payments without
  // requiring a manual click. Other tabs don't get the refresh because
  // their data is more user-driven (search/filter) and they don't display
  // the moving KPIs.
  useEffect(() => {
    if (tab !== "overview") return;
    const id = setInterval(() => {
      fetchStats().then(() => setStatsLastFetchedAt(Date.now()));
    }, 60_000);
    return () => clearInterval(id);
  }, [tab, fetchStats]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) {
        await fetchOrders();
        await fetchStats();
      }
    } catch (err) { console.error(err); } finally {
      setUpdatingOrder(null);
    }
  };

  const updateOrderTracking = async (orderId: string, trackingNumber: string, trackingUrl?: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, trackingNumber, trackingUrl, status: "shipped" }),
      });
      if (res.ok) {
        await fetchOrders();
        await fetchStats();
      }
    } catch (err) { console.error(err); } finally {
      setUpdatingOrder(null);
    }
  };

  const navItems = [
    { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
    { id: "orders" as Tab, label: "Orders", icon: ShoppingBag },
    // Positioned directly under Orders so the abandoned-cart-followup
    // workflow stays adjacent to the orders surface — operator hops
    // between the two when triaging the queue.
    { id: "hvFollowup" as Tab, label: "HV Follow-up", icon: Sparkles },
    { id: "cashFlow" as Tab, label: "Cash Flow", icon: DollarSign },
    { id: "analytics" as Tab, label: "Analytics", icon: BarChart3 },
    { id: "users" as Tab, label: "Customers", icon: Users },
    { id: "messages" as Tab, label: "Messages", icon: MessageSquare },
    { id: "outbox" as Tab, label: "Outbox", icon: Inbox },
  ];

  const secondaryNavItems = [
    { id: "wholesale" as Tab, label: "Wholesale", icon: Building2 },
    { id: "affiliates" as Tab, label: "Affiliates", icon: Link2 },
    // Lab/COA management. Positioned in the secondary nav since the
    // operator interacts with it weekly (per-batch upload) not hourly.
    { id: "coas" as Tab, label: "Lab COAs", icon: FileCheck },
    { id: "settings" as Tab, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-accent/30">
      {/* Top bar — clean text-only branding for screenshot/demo mode. The
          public brand mark intentionally lives ONLY on customer-facing
          pages so admin dashboards stay neutral when shared in pitches
          or shoulder-shown to outsiders. */}
      <header className="bg-gradient-to-r from-primary via-primary to-primary/90 text-white px-6 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)] animate-pulse" aria-hidden="true" />
          <span className="font-serif text-lg tracking-tight">Command Center</span>
          <span className="text-white/30">·</span>
          <span className="text-xs text-white/60 uppercase tracking-[0.18em]">Live</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70">{user?.email}</span>
          <button onClick={signOut} className="text-white/60 hover:text-white transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-border min-h-[calc(100vh-48px)] p-4 flex flex-col">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  tab === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-auto pt-4 border-t border-border space-y-1">
            {secondaryNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); setSearchQuery(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  tab === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {tab === "overview" && (
            <OverviewTab
              stats={stats}
              revenueByDay={revenueByDay}
              topProducts={topProducts}
              recentOrders={recentOrders}
              inFlightShipments={inFlightShipments}
              shipStationPoll={shipStationPoll}
              loading={loading}
              statsLastFetchedAt={statsLastFetchedAt}
              onRefresh={() => {
                fetchStats().then(() => setStatsLastFetchedAt(Date.now()));
              }}
              onJumpToTab={(t) => setTab(t)}
              onJumpToOrder={(id) => {
                // Pre-expand the order so when the Orders tab loads, the
                // detail panel is already open. Tab change triggers
                // fetchOrders() via the useEffect; once orders land, the
                // expandedOrder state is already set so the right card
                // renders open.
                setExpandedOrder(id);
                setTab("orders");
              }}
            />
          )}
          {tab === "cashFlow" && <CashFlowTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "outbox" && <OutboxTab />}
          {tab === "hvFollowup" && <HighValueFollowupTab />}
          {tab === "coas" && <CoasTab />}
          {tab === "orders" && (
            <OrdersTab
              orders={orders}
              loading={loading}
              filter={orderFilter}
              setFilter={setOrderFilter}
              search={searchQuery}
              setSearch={setSearchQuery}
              expandedOrder={expandedOrder}
              setExpandedOrder={setExpandedOrder}
              updatingOrder={updatingOrder}
              updateStatus={updateOrderStatus}
              updateTracking={updateOrderTracking}
              onRefresh={fetchOrders}
              onCreateManual={() => setManualOrderOpen(true)}
            />
          )}
          {tab === "users" && (
            <UsersTab
              users={users}
              loading={loading}
              search={searchQuery}
              setSearch={setSearchQuery}
            />
          )}
          {tab === "messages" && (
            <MessagesTab
              messages={messages}
              loading={loading}
              search={searchQuery}
              setSearch={setSearchQuery}
              onRefresh={fetchMessages}
            />
          )}
          {tab === "wholesale" && (
            <WholesaleTab accounts={wholesaleAccounts} loading={loading} onRefresh={fetchWholesale} />
          )}
          {tab === "affiliates" && (
            <AffiliatesTab affiliates={affiliates} loading={loading} onRefresh={fetchAffiliates} />
          )}
          {tab === "settings" && <SettingsTab />}
        </main>
      </div>

      {/* Create Custom Order modal — mounted at the root so it overlays
          everything. Triggered from the "Create custom order" button in
          the Orders tab header. On success, refreshes orders + stats so
          the new row shows up immediately. */}
      <CreateManualOrderModal
        open={manualOrderOpen}
        onClose={() => setManualOrderOpen(false)}
        onCreated={async (orderNumber) => {
          console.log(`[Admin] Manual order created: ${orderNumber}`);
          await Promise.all([fetchOrders(), fetchStats()]);
          setTab("orders");
        }}
      />
    </div>
  );
}

// ── OVERVIEW TAB ────────────────────────────────────────────
function OverviewTab({
  stats,
  revenueByDay,
  topProducts,
  recentOrders,
  inFlightShipments,
  shipStationPoll,
  loading,
  onJumpToTab,
  onJumpToOrder,
  statsLastFetchedAt,
  onRefresh,
}: {
  stats: Stats | null;
  revenueByDay: RevenueDay[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  inFlightShipments: InFlightShipment[];
  shipStationPoll: ShipStationPoll | null;
  loading: boolean;
  statsLastFetchedAt: number | null;
  onRefresh: () => void;
  onJumpToTab: (t: Tab) => void;
  onJumpToOrder: (id: string) => void;
}) {
  if (loading || !stats) {
    return <div className="text-muted text-sm">Loading dashboard…</div>;
  }

  const revenueToday = stats.revenueToday ?? 0;
  const revenueYesterday = stats.revenueYesterday ?? 0;
  const ordersToday = stats.ordersToday ?? 0;
  const ordersYesterday = stats.ordersYesterday ?? 0;
  const revenueDelta = revenueYesterday > 0
    ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
    : null;
  const profitToday = stats.profitTodayCents ?? 0;
  const profitYesterday = stats.profitYesterdayCents ?? 0;
  const profitDelta = profitYesterday > 0
    ? ((profitToday - profitYesterday) / profitYesterday) * 100
    : null;
  const revenueMtd = stats.revenueMtdCents ?? 0;
  const revenuePriorMtd = stats.revenuePriorMtdCents ?? 0;
  const revenueMtdDelta = revenuePriorMtd > 0
    ? ((revenueMtd - revenuePriorMtd) / revenuePriorMtd) * 100
    : null;
  const profitMtd = stats.profitMtdCents ?? 0;
  const profitPriorMtd = stats.profitPriorMtdCents ?? 0;
  const profitMtdDelta = profitPriorMtd > 0
    ? ((profitMtd - profitPriorMtd) / profitPriorMtd) * 100
    : null;
  const attentionCount =
    (stats.flaggedOrders ?? 0) + (stats.stuckOrders ?? 0) + (stats.subsPaymentFailed ?? 0);

  // Live "Updated Xs ago" — recomputes every second so the indicator
  // always feels real-time without needing the parent to re-render.
  return (
    <div>
      {/* Show-off-mode hero strip — gradient + live status + today's
          revenue as the prominent number. Designed to look impressive
          in a screenshot or shoulder-share without revealing vendor
          relationships or internal metrics that don't belong in a pitch. */}
      <div className="mb-6 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary via-primary to-primary/85 text-white p-6 md:p-8">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)",
        }} aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/80">Live · Realtime</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-white/70 mb-1">Today</p>
            <p className="font-serif text-4xl md:text-5xl tracking-tight">{formatPriceShort(revenueToday)}</p>
            <p className="text-sm text-white/80 mt-1.5">
              {ordersToday} order{ordersToday === 1 ? "" : "s"} ·{" "}
              {formatPriceShort(stats.profitTodayCents ?? 0)} profit
              {revenueDelta !== null && (
                <span className={`ml-2 text-xs font-semibold ${revenueDelta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {revenueDelta >= 0 ? "▲" : "▼"} {Math.abs(revenueDelta).toFixed(1)}% vs yesterday
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-white/70 mb-1">Month-to-date</div>
            <div className="font-serif text-2xl tracking-tight">{formatPriceShort(revenueMtd)}</div>
            <div className="text-xs text-white/70 mt-0.5">
              {formatPriceShort(profitMtd)} profit
              {revenueMtdDelta !== null && (
                <span className={`ml-1.5 font-semibold ${revenueMtdDelta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {revenueMtdDelta >= 0 ? "▲" : "▼"} {Math.abs(revenueMtdDelta).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <DataFreshness lastFetchedAt={statsLastFetchedAt} onRefresh={onRefresh} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Today vs Yesterday ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <HeroCard
          label="Today's Revenue"
          value={formatPriceShort(revenueToday)}
          sub={`${ordersToday} ${ordersToday === 1 ? "order" : "orders"} today`}
          delta={revenueDelta}
          icon={DollarSign}
          accent="green"
        />
        {/* Net profit today — gross margin on goods (paid orders only).
            Computed server-side in /api/admin/stats from per-SKU costs.
            Only renders when we have at least one paid order and a
            non-zero revenue figure today. */}
        <HeroCard
          label="Today's Profit"
          value={formatPriceShort(stats.profitTodayCents ?? 0)}
          sub={
            (stats.revenueTodayPaidCents ?? 0) > 0
              ? `${Math.round(((stats.profitTodayCents ?? 0) / (stats.revenueTodayPaidCents ?? 1)) * 100)}% margin · ${formatPriceShort(stats.cogsTodayCents ?? 0)} COGS`
              : "No paid orders yet today"
          }
          delta={profitDelta}
          icon={TrendingUp}
          accent="green"
        />
        <HeroCard
          label="Needs Attention"
          value={String(attentionCount)}
          sub={
            attentionCount === 0
              ? "Inbox zero ✨"
              : `${stats.stuckOrders ?? 0} stuck · ${stats.flaggedOrders ?? 0} fraud · ${stats.subsPaymentFailed ?? 0} dunning`
          }
          icon={AlertCircle}
          accent={attentionCount === 0 ? "green" : "red"}
          onClick={() => onJumpToTab("orders")}
        />
      </div>

      {/* ── Yesterday ── Closed-day numbers — no delta because the day
          is already in the books. Shown as its own row so the operator can see
          the absolute revenue + profit at a glance instead of having to
          mentally back them out from today's percent-delta. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <HeroCard
          label="Yesterday's Revenue"
          value={formatPriceShort(revenueYesterday)}
          sub={`${ordersYesterday} ${ordersYesterday === 1 ? "order" : "orders"} yesterday`}
          icon={DollarSign}
          accent="green"
        />
        <HeroCard
          label="Yesterday's Profit"
          value={formatPriceShort(stats.profitYesterdayCents ?? 0)}
          sub={
            (stats.revenueYesterdayPaidCents ?? 0) > 0
              ? `${Math.round(((stats.profitYesterdayCents ?? 0) / (stats.revenueYesterdayPaidCents ?? 1)) * 100)}% margin · ${formatPriceShort(stats.cogsYesterdayCents ?? 0)} COGS`
              : "No paid orders yesterday"
          }
          icon={TrendingUp}
          accent="green"
        />
      </div>

      {/* ── Month-to-date ── Same definitions as Today (paid orders,
          gross-margin profit), windowed from midnight on the 1st of the
          current calendar month. The delta compares against the prior
          month at the SAME point-in-month — so on April 12 we compare
          to March 1-12, not all of March. That tells us whether April
          is pacing ahead of or behind March. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <HeroCard
          label={`${new Date().toLocaleDateString("en-US", { month: "long" })} Revenue (MTD)`}
          value={formatPriceShort(revenueMtd)}
          sub={
            revenuePriorMtd > 0
              ? `${stats.ordersMtd ?? 0} ${(stats.ordersMtd ?? 0) === 1 ? "order" : "orders"} · vs ${formatPriceShort(revenuePriorMtd)} prior month at this point`
              : `${stats.ordersMtd ?? 0} ${(stats.ordersMtd ?? 0) === 1 ? "order" : "orders"} this month`
          }
          delta={revenueMtdDelta}
          icon={DollarSign}
          accent="green"
        />
        <HeroCard
          label={`${new Date().toLocaleDateString("en-US", { month: "long" })} Profit (MTD)`}
          value={formatPriceShort(profitMtd)}
          sub={
            (stats.revenueMtdPaidCents ?? 0) > 0
              ? `${Math.round(((stats.profitMtdCents ?? 0) / (stats.revenueMtdPaidCents ?? 1)) * 100)}% margin · ${formatPriceShort(stats.cogsMtdCents ?? 0)} COGS`
              : "No paid orders yet this month"
          }
          delta={profitMtdDelta}
          icon={TrendingUp}
          accent="green"
        />
      </div>

      {/* ── Health Pulse (30d) ──
          Refund rate, AOV trend, bump take-rate. Compact strip — each
          tile is one number plus a small subtext. Lets the operator
          spot trend reversals at a glance without pulling up the
          dedicated reports. */}
      <HealthPulseStrip stats={stats} />

      {/* ── Live Traffic (PostHog-backed, 15s refresh) ── */}
      <div className="mb-6">
        <LiveTrafficWidget />
      </div>

      {/* ── In-flight shipments ──
          Live UPS/USPS tracking links for orders that have a tracking
          URL set, aren't delivered yet, and aren't cancelled/refunded.
          Click any row to open the carrier's tracking page in a new
          tab. Capped at 20 most-recent. */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">In-flight shipments</h2>
            <span className="text-[11px] text-muted">({inFlightShipments.length})</span>
          </div>
          <span className="text-[10px] text-muted uppercase tracking-wider">Click to track</span>
        </div>
        {inFlightShipments.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No shipments in flight right now.</p>
        ) : (
          <ul className="divide-y divide-border">
            {inFlightShipments.map((s) => {
              const milestoneLabel = (() => {
                switch (s.trackingMilestone) {
                  case "in_transit": return { text: "In transit", color: "bg-blue-50 text-blue-700 border-blue-200" };
                  case "out_for_delivery": return { text: "Out for delivery", color: "bg-amber-50 text-amber-700 border-amber-200" };
                  case "delivered": return { text: "Delivered", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
                  case "exception": return { text: "Exception", color: "bg-red-50 text-red-700 border-red-200" };
                  case "pending": return { text: "Label cut", color: "bg-muted/20 text-muted border-border" };
                  default: return { text: "Pending", color: "bg-muted/20 text-muted border-border" };
                }
              })();
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={s.trackingUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[13px] text-primary hover:underline inline-flex items-center gap-1"
                        title={`Open ${s.trackingCarrier?.toUpperCase() || "carrier"} tracking · ${s.trackingNumber}`}
                      >
                        {s.trackingNumber || "(no number)"}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${milestoneLabel.color}`}
                      >
                        {milestoneLabel.text}
                      </span>
                      {s.trackingCarrier && (
                        <span className="text-[10px] text-muted uppercase tracking-wider">
                          {s.trackingCarrier}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      <button
                        type="button"
                        onClick={() => onJumpToOrder(s.id)}
                        className="font-mono hover:underline cursor-pointer"
                      >
                        #{s.orderNumber}
                      </button>
                      {s.recipient && <> · {s.recipient}</>}
                      {s.state && <> · {s.state}</>}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted whitespace-nowrap tabular-nums">
                    {formatOrderDateTime(s.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Revenue sparkline ── */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Revenue — last 30 days</h2>
            <p className="text-xs text-muted mt-0.5">
              Total {formatPriceShort(stats.revenue30d)} · AOV {formatPriceShort(stats.aov30d ?? 0)}
            </p>
          </div>
        </div>
        <RevenueSparkline data={revenueByDay} />
      </div>

      {/* ── Top products + Payment split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <TopProductsCard products={topProducts} />

        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted" /> Paid orders (30d)
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground tabular-nums">{stats.paidCount30d ?? 0}</span>
            <span className="text-xs text-muted">orders</span>
          </div>
          <div className="text-sm text-muted mt-1">
            {formatPriceShort(stats.paidRevenue30d ?? 0)} in revenue
          </div>
          <p className="text-[11px] text-muted mt-3 leading-relaxed">
            Orders move to paid once your payment processor confirms payment. No processor is wired in this template.
          </p>
        </div>
      </div>

      {/* ── Fulfillment pipeline + Customer counts ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <PipelineCard
          icon={AlertCircle}
          color="amber"
          label="Pending"
          value={stats.pendingOrders}
          sub={(stats.stuckOrders ?? 0) > 0 ? `${stats.stuckOrders} stuck >3d` : undefined}
          subTone="red"
        />
        <PipelineCard icon={Package} color="purple" label="Processing" value={stats.processingOrders} />
        <PipelineCard icon={Truck} color="cyan" label="Shipped" value={stats.shippedOrders} />
        <PipelineCard icon={Users} color="blue" label="Total Customers" value={stats.totalUsers} />
        <PipelineCard icon={Zap} color="emerald" label="New Today" value={stats.newUsersToday ?? 0} />
      </div>

      {/* ── Recent activity feed ── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent orders</h2>
          <button
            onClick={() => onJumpToTab("orders")}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            View all →
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted px-5 py-6">No orders yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.slice(0, 10).map((o) => {
              const sc = STATUS_CONFIG[getDisplayStatus(o)] || STATUS_CONFIG.pending;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onJumpToOrder(o.id)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-accent/30 transition-colors text-left cursor-pointer"
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color} flex-shrink-0`}>
                    {sc.label}
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground flex-shrink-0">
                    #{o.orderNumber}
                  </span>
                  <span className="text-xs text-muted truncate min-w-0 flex-1">
                    {o.email}
                    {o.customerPhone && (
                      <span
                        className={`ml-2 tabular-nums whitespace-nowrap ${
                          o.paymentStatus !== "completed"
                            ? "text-foreground font-medium"
                            : "text-muted"
                        }`}
                      >
                        · {formatPhoneDisplay(o.customerPhone)}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-muted flex-shrink-0 capitalize">
                    {o.paymentGateway ? o.paymentGateway.replace(/_/g, " ") : "—"}
                  </span>
                  <span className="text-sm font-semibold text-foreground flex-shrink-0">
                    {formatPriceShort(o.total)}
                  </span>
                  <span className="text-[11px] text-muted flex-shrink-0 w-16 text-right">
                    {relativeTime(o.createdAt)}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ShipStation poll pulse ──
          Visibility into the custom-store integration: ShipStation polls
          /api/shipstation/orders every 15-30 min to pull paid+confirmed
          orders. We can't know whether they pulled a SPECIFIC order
          (their side, no receipt sent), but we DO know when they last
          polled overall — green if recent, amber if stale, red if
          totally silent. */}
      <ShipStationPollCard poll={shipStationPoll} />
    </div>
  );
}

// ── ShipStation poll status card ──
function ShipStationPollCard({ poll }: { poll: ShipStationPoll | null }) {
  // Tick state so "X min ago" stays fresh without a page refresh.
  // Computing Date.now() directly during render trips React 19's
  // purity lint; useState + interval is the canonical fix.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const lastAt = poll?.lastPollAt ? new Date(poll.lastPollAt) : null;
  const minutesAgo = lastAt ? Math.floor((now - lastAt.getTime()) / 60000) : null;
  const tone =
    minutesAgo == null ? "silent" : minutesAgo < 60 ? "green" : minutesAgo < 24 * 60 ? "amber" : "red";
  const dot =
    tone === "green"
      ? "bg-green-500"
      : tone === "amber"
      ? "bg-amber-500"
      : tone === "red"
      ? "bg-red-500"
      : "bg-muted";
  const label =
    minutesAgo == null
      ? "ShipStation has not polled recently"
      : minutesAgo === 0
      ? "Just polled"
      : minutesAgo < 60
      ? `${minutesAgo} min ago`
      : minutesAgo < 60 * 24
      ? `${Math.floor(minutesAgo / 60)} hr ago`
      : `${Math.floor(minutesAgo / (60 * 24))} day ago`;

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">ShipStation integration</h2>
        <a
          href="https://ship.shipstation.com/orders"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Open ShipStation &rarr;
        </a>
      </div>
      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Last poll: {label}</span>
        </div>
        {poll && poll.lastPollOrderCount != null && (
          <span className="text-xs text-muted tabular-nums">
            {poll.lastPollOrderCount} order{poll.lastPollOrderCount === 1 ? "" : "s"} served on that poll
          </span>
        )}
        {poll && poll.pollCount24h > 0 && (
          <span className="text-xs text-muted tabular-nums">
            &middot; {poll.pollCount24h} poll{poll.pollCount24h === 1 ? "" : "s"} in last 24h
          </span>
        )}
      </div>
      <div className="px-5 pb-4">
        <p className="text-xs text-muted leading-relaxed">
          ShipStation pulls paid + confirmed orders from us every 15&ndash;30 min via the Custom-Store
          integration. To pull <em>right now</em>, log in and click <strong>Refresh from Store</strong>.
          {minutesAgo != null && minutesAgo > 60 && (
            <span className="block mt-1 text-amber-700">
              &#9888; It&apos;s been a while since the last poll &mdash; verify the store status in ShipStation if
              you&apos;re seeing recent orders not flow through.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Health Pulse strip ───────────────────────────────────────────
// Compact 30d-window KPI tiles: refund rate, AOV trend, bump take-rate.
// Each pulls from props.stats (already in the dashboard payload) except
// bump which has its own widget.
function HealthPulseStrip({ stats }: { stats: Stats }) {
  const revenue30d = stats.revenue30d ?? 0;
  const refunded30d = stats.refunded30dCents ?? 0;
  const refundRate = revenue30d > 0 ? (refunded30d / revenue30d) * 100 : 0;
  const aovNow = stats.aov30d ?? 0;
  const aovPrior = stats.aovPrior30dCents ?? 0;
  const aovDelta = aovPrior > 0 ? ((aovNow - aovPrior) / aovPrior) * 100 : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      <PulseTile
        label="Refund rate (30d)"
        value={`${refundRate.toFixed(1)}%`}
        sub={`${formatPriceShort(refunded30d)} refunded · ${formatPriceShort(revenue30d)} gross`}
        tone={refundRate >= 5 ? "negative" : refundRate >= 2 ? "warning" : "positive"}
      />
      <PulseTile
        label="AOV (30d)"
        value={formatPriceShort(aovNow)}
        sub={
          aovDelta == null
            ? "no prior-30d baseline yet"
            : `${aovDelta >= 0 ? "▲" : "▼"} ${Math.abs(aovDelta).toFixed(1)}% vs prior 30d (${formatPriceShort(aovPrior)})`
        }
        tone={aovDelta == null ? "neutral" : aovDelta >= 0 ? "positive" : "negative"}
      />
      <BumpStatsCard />
    </div>
  );
}

function PulseTile({
  label, value, sub, tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "warning" | "neutral";
}) {
  const valueClass =
    tone === "positive" ? "text-success"
    : tone === "negative" ? "text-destructive"
    : tone === "warning" ? "text-amber-600"
    : "text-foreground";
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1.5 ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted mt-1 leading-tight">{sub}</p>}
    </div>
  );
}

// ── Top products card with sort toggle ──────────────────────────
// Replaces the old inline block. Same data shape, but the admin can
// flip between sorting by revenue / profit $ / margin %. Useful for
// shifting attention from "what sells" to "what's most profitable".
function TopProductsCard({ products }: { products: TopProduct[] }) {
  const [sortBy, setSortBy] = useState<"revenue" | "profit" | "margin">("revenue");

  const sorted = [...products].sort((a, b) => {
    if (sortBy === "revenue") return b.revenue - a.revenue;
    if (sortBy === "profit") return (b.profit ?? 0) - (a.profit ?? 0);
    // margin %: handle nulls so a costless variant sinks to the bottom
    return (b.marginPct ?? -1) - (a.marginPct ?? -1);
  });
  const top = sorted.slice(0, 5);
  const maxValue = (() => {
    if (sortBy === "revenue") return top[0]?.revenue || 1;
    if (sortBy === "profit") return Math.max(1, ...top.map((p) => p.profit ?? 0));
    return Math.max(1, ...top.map((p) => p.marginPct ?? 0));
  })();

  return (
    <div className="bg-white rounded-xl border border-border p-5 lg:col-span-2">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-sm font-semibold text-foreground">Top products (30d)</h2>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-[11px]">
          {(["revenue", "profit", "margin"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`px-2.5 py-1 transition-colors cursor-pointer ${
                sortBy === opt ? "bg-primary text-primary-foreground" : "bg-card text-muted hover:text-foreground"
              }`}
            >
              {opt === "revenue" ? "Revenue" : opt === "profit" ? "Profit $" : "Margin %"}
            </button>
          ))}
        </div>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-muted">No sales in this window yet.</p>
      ) : (
        <div className="space-y-2">
          {top.map((p, i) => {
            const value =
              sortBy === "revenue" ? p.revenue
              : sortBy === "profit" ? (p.profit ?? 0)
              : (p.marginPct ?? 0);
            const width = (value / maxValue) * 100;
            const profit = p.profit ?? 0;
            const marginPct = p.marginPct;
            return (
              <div key={p.productId} className="flex items-center gap-3">
                <span className="text-xs text-muted w-4 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-3">
                    <span className="text-sm text-foreground truncate">{p.productName}</span>
                    <span className="text-xs text-muted flex-shrink-0 tabular-nums">
                      {p.unitsSold}u · <span className="text-foreground font-medium">{formatPriceShort(p.revenue)}</span>
                      {marginPct != null && (
                        <span className={`ml-1.5 ${profit > 0 ? "text-success" : "text-destructive"}`}>
                          ({formatPriceShort(profit)} · {marginPct}%)
                        </span>
                      )}
                      {p.hasMissingCost && (
                        <span className="ml-1 text-amber-600" title="Some variants lack cost data — profit is partial">⚠</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sortBy === "revenue" ? "bg-primary" : sortBy === "profit" ? "bg-success" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.max(2, width)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Hero metric card — bigger cards up top, optionally with a delta and
// a click-through to jump the admin to a specific tab.
function HeroCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: "green" | "blue" | "red" | "amber";
  onClick?: () => void;
}) {
  const accentBg: Record<string, string> = {
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
    red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50",
  };
  const Wrap: "div" | "button" = onClick ? "button" : "div";
  return (
    <Wrap
      onClick={onClick}
      className={`bg-white rounded-xl border border-border p-5 text-left ${
        onClick ? "hover:border-primary/50 transition-colors cursor-pointer w-full" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted uppercase tracking-wider font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentBg[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {typeof delta === "number" && (
          <span
            className={`text-xs font-medium flex items-center gap-0.5 ${
              delta >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </Wrap>
  );
}

function PipelineCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
  subTone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "amber" | "purple" | "cyan" | "blue" | "emerald";
  label: string;
  value: number;
  sub?: string;
  subTone?: "red" | "muted";
}) {
  const bg: Record<string, string> = {
    amber: "border-amber-200",
    purple: "border-purple-200",
    cyan: "border-cyan-200",
    blue: "border-blue-200",
    emerald: "border-emerald-200",
  };
  const fg: Record<string, string> = {
    amber: "text-amber-500",
    purple: "text-purple-500",
    cyan: "text-cyan-500",
    blue: "text-blue-500",
    emerald: "text-emerald-500",
  };
  const subClass = subTone === "red" ? "text-red-600 font-medium" : "text-muted";
  return (
    <div className={`bg-white rounded-xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${fg[color]}`} />
        <span className="text-[11px] font-medium text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className={`text-[10px] mt-0.5 ${subClass}`}>{sub}</p>}
    </div>
  );
}

/**
 * Lightweight SVG bar chart for daily revenue. Bars scale to the max bar in
 * the series; zero-revenue days render as a 2px floor so the axis is visible.
 * No external chart lib — keeps the admin bundle small.
 */
function RevenueSparkline({ data }: { data: RevenueDay[] }) {
  if (data.length === 0) {
    return <div className="h-24 flex items-center justify-center text-sm text-muted">No revenue data yet.</div>;
  }
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d) => {
        const height = Math.max((d.revenue / max) * 100, 2);
        // Compare against TODAY in America/Chicago (matches the
        // server-side groupBy timezone). Plain toISOString().slice(0,10)
        // returns the UTC date and would highlight the wrong bar after
        // 6/7pm Central.
        const todayCt = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Chicago",
          year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date());
        const isToday = d.day === todayCt;
        return (
          <div
            key={d.day}
            className="flex-1 min-w-0 flex flex-col items-center justify-end"
            title={`${d.day}: ${formatPriceShort(d.revenue)} · ${d.orderCount} orders`}
          >
            <div
              className={`w-full rounded-t transition-colors ${
                isToday ? "bg-primary" : d.revenue > 0 ? "bg-primary/50 hover:bg-primary" : "bg-border"
              }`}
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Live "Updated Xs ago · auto-refresh in Ys" indicator. Re-renders every
// second via setInterval. Click to force-refresh stats now.
function DataFreshness({
  lastFetchedAt,
  onRefresh,
}: {
  lastFetchedAt: number | null;
  onRefresh: () => void;
}) {
  // Live "Now" tick — stored in state so React 19's purity lint
  // doesn't flag the Date.now() read, and so we don't need the
  // void-tick suppression dance that the previous version used.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!lastFetchedAt) {
    return (
      <span className="text-xs text-muted">Loading…</span>
    );
  }
  const ageSec = Math.max(0, Math.floor((now - lastFetchedAt) / 1000));
  const refreshIn = Math.max(0, 60 - ageSec);
  return (
    <button
      onClick={onRefresh}
      className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer"
      title="Click to refresh now"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
      <span className="tabular-nums">
        Updated {ageSec < 60 ? `${ageSec}s` : `${Math.floor(ageSec / 60)}m`} ago
        {refreshIn > 0 && ageSec < 60 && ` · refresh in ${refreshIn}s`}
      </span>
      <RefreshCw className="w-3 h-3" />
    </button>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

// ── ORDERS TAB ──────────────────────────────────────────────
function OrdersTab({
  orders, loading, filter, setFilter, search, setSearch,
  expandedOrder, setExpandedOrder, updatingOrder, updateStatus, updateTracking, onRefresh,
  onCreateManual,
}: {
  orders: Order[];
  loading: boolean;
  filter: string;
  setFilter: (f: string) => void;
  search: string;
  setSearch: (s: string) => void;
  expandedOrder: string | null;
  setExpandedOrder: (id: string | null) => void;
  updatingOrder: string | null;
  updateStatus: (id: string, status: string) => void;
  updateTracking: (id: string, tracking: string, url?: string) => void;
  onRefresh: () => void;
  onCreateManual: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-foreground">Orders</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onCreateManual}
            className="text-sm text-primary hover:text-primary-light flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Create custom order
          </button>
          <button onClick={onRefresh} className="text-sm text-muted hover:text-foreground flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by order # or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-white cursor-pointer"
        >
          {/* Composite filters first — these are the daily-driver views.
              `paid` = anyone who actually completed checkout.
              `abandoned` = pending+unpaid (the SMS-recovery pool). */}
          <option value="paid">💰 Paid (default)</option>
          <option value="abandoned">⚠️ Abandoned carts</option>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Payment failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Order list */}
      {loading ? (
        <p className="text-sm text-muted">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <Package className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            // Display status — "pending" orders older than ABANDONED_AFTER_MS
            // surface as "abandoned" in the badge. The underlying DB row
            // stays pending so payment recovery / admin action paths still
            // see it as a live order they could push.
            const displayStatus = getDisplayStatus(order);
            const sc = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.pending;
            const isExpanded = expandedOrder === order.id;
            const isUpdating = updatingOrder === order.id;

            return (
              <div key={order.id} className="bg-white rounded-xl border border-border overflow-hidden">
                {/* Row uses div+role=button instead of a real <button>
                    so we can nest <a href="mailto:"> / <a href="sms:">
                    children without invalid-nesting issues. Keyboard
                    accessibility preserved via role + tabIndex + Enter/
                    Space handler. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedOrder(isExpanded ? null : order.id);
                    }
                  }}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-sm font-bold text-foreground">#{order.orderNumber}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sc.bg} ${sc.color} whitespace-nowrap`}>
                      {sc.label}
                    </span>
                    {/* Coupon chip — visible at-a-glance signal that this
                        order was promo-driven. Especially useful on
                        abandoned carts (did a coupon apply but they
                        never paid?). */}
                    {order.couponCode && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap"
                        title={`Coupon ${order.couponCode} applied`}
                      >
                        🎟 {order.couponCode}
                      </span>
                    )}
                    {/* Possible-duplicate pill. Set when this order
                        was placed within 5 min of an earlier paid
                        order from the same customer with identical
                        line items. The customer has already been
                        sent a confirmation SMS asking if they meant
                        to place both orders. Surface here so admin
                        can prioritise reach-out / refund decision. */}
                    {order.dupOfOrderId && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap"
                        title={
                          order.dupConfirmationSmsSentAt
                            ? `Likely duplicate of an earlier order. Confirmation SMS sent ${relativeTime(order.dupConfirmationSmsSentAt)}.`
                            : "Likely duplicate of an earlier order placed within 5 minutes."
                        }
                      >
                        ⚠ Possible duplicate
                      </span>
                    )}
                    {/* Email + phone are wrapped in actual <a> tags so
                        clicking opens Mail / Messages directly. Both
                        use stopPropagation so the click doesn't also
                        toggle the row's expand state. select-text +
                        onMouseDown stop so the user can drag-select
                        and copy the value without the row collapsing. */}
                    <a
                      href={`mailto:${order.email}`}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="text-sm text-muted truncate hover:text-primary hover:underline select-text"
                      title={`Email ${order.email}`}
                    >
                      {order.email}
                    </a>
                    {/* Phone is always shown when on file. For pending /
                        abandoned / unpaid rows we bump the prominence —
                        foreground color + medium weight — so an admin
                        scanning the orders table for abandoned-cart
                        outreach can read the number at a glance without
                        expanding the row. For paid rows the muted style
                        stays (the phone is reference data, not action). */}
                    {order.customerPhone && (
                      <a
                        href={`sms:${order.customerPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`text-[12px] tabular-nums whitespace-nowrap hover:text-primary hover:underline select-text ${
                          order.paymentStatus !== "completed"
                            ? "text-foreground font-medium"
                            : "text-muted"
                        }`}
                        title={`Text ${order.customerPhone}`}
                      >
                        · {formatPhoneDisplay(order.customerPhone)}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Click-to-text button for abandoned/pending orders
                        with a phone on file. Stop propagation so the row
                        click doesn't also expand the order detail. */}
                    {(displayStatus === "abandoned" || (order.status === "pending" && order.customerPhone)) && order.customerPhone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const sa = order.shippingAddress as { firstName?: string } | null;
                          handleAbandonTextClick({
                            phone: order.customerPhone!,
                            firstName: sa?.firstName ?? null,
                          });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                        title={`Text ${order.customerPhone}`}
                      >
                        <MessageSquare className="w-3 h-3" /> Text
                      </button>
                    )}
                    {/* "Send thank-you" — visible on every PAID order
                        with a phone. Click opens iMessage with a
                        pre-populated body thanking the customer and
                        promising shipping updates. POSTs to the stamp
                        endpoint so the UI shows "Thanked Xm ago" on
                        subsequent renders (admin can still re-click
                        to re-open iMessage with the same body). */}
                    {order.paymentStatus === "completed" && order.customerPhone && (
                      <ThankYouSmsButton order={order} onStamped={onRefresh} />
                    )}
                    <span className="font-semibold text-foreground">{formatPriceShort(order.total)}</span>
                    <span className="text-xs text-muted whitespace-nowrap tabular-nums">{formatOrderDateTime(order.createdAt)}</span>
                    <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-5 space-y-5">
                    {/* Two-column: left = items + address, right = tracking + payment */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Left column */}
                      <div className="space-y-5">
                        {/* Line items */}
                        {order.items && order.items.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Items ({order.items.length})</h4>
                            <div className="space-y-1.5">
                              {order.items.map((it) => (
                                <div key={it.id} className="flex items-start justify-between text-sm gap-3">
                                  <div className="min-w-0">
                                    <p className="text-foreground truncate">
                                      {it.quantity}× {it.productName}
                                    </p>
                                    <p className="text-[11px] text-muted">
                                      {it.variantSize} · SKU {it.variantSku}
                                    </p>
                                  </div>
                                  <span className="text-foreground font-medium flex-shrink-0">
                                    {formatPriceShort(it.lineTotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Shipping address */}
                        {order.shippingAddress && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Ship to</h4>
                            <p className="text-sm text-foreground leading-relaxed">
                              {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                              {order.shippingAddress.address1}<br />
                              {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
                              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                              <br />
                              <span className="text-xs text-muted">{order.shippingAddress.country}</span>
                            </p>
                            {(order.shippingAddress.companyName || order.shippingAddress.companyEmail || order.shippingAddress.department) && (
                              <p className="text-xs text-muted leading-relaxed mt-1.5">
                                {order.shippingAddress.companyName && <>Company: <span className="text-foreground">{order.shippingAddress.companyName}</span><br /></>}
                                {order.shippingAddress.companyEmail && <>Company email: <span className="text-foreground">{order.shippingAddress.companyEmail}</span><br /></>}
                                {order.shippingAddress.department && <>Dept: <span className="text-foreground">{DEPARTMENT_LABELS[order.shippingAddress.department] ?? order.shippingAddress.department}</span></>}
                              </p>
                            )}
                            {order.userId && (
                              <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                                {order.institutionVerifiedAt ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Institution verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warm">
                                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" /> Institution not verified
                                  </span>
                                )}
                                <button
                                  onClick={async () => {
                                    const next = !order.institutionVerifiedAt;
                                    try {
                                      const res = await fetch("/api/admin/users/verify-institution", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ userId: order.userId, verified: next }),
                                      });
                                      if (!res.ok) return;
                                      // Re-pull orders so every row from this buyer reflects
                                      // the new verification status (joined server-side).
                                      onRefresh();
                                    } catch { /* non-fatal */ }
                                  }}
                                  className="text-[11px] text-primary hover:underline cursor-pointer"
                                >
                                  {order.institutionVerifiedAt ? "Unverify" : "Mark verified"}
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const addr = order.shippingAddress!;
                                const text = `${addr.firstName} ${addr.lastName}\n${addr.address1}${addr.address2 ? "\n" + addr.address2 : ""}\n${addr.city}, ${addr.state} ${addr.zip}\n${addr.country}`;
                                navigator.clipboard?.writeText(text).catch(() => {});
                              }}
                              className="text-[11px] text-primary hover:underline cursor-pointer mt-1"
                            >
                              Copy address
                            </button>
                          </div>
                        )}

                        {/* Order summary */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Summary</h4>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPriceShort(order.subtotal)}</span></div>
                            {order.discount != null && order.discount > 0 && (
                              <div className="flex justify-between"><span className="text-muted">Discount</span><span className="text-success">-{formatPriceShort(order.discount)}</span></div>
                            )}
                            <div className="flex justify-between"><span className="text-muted">Shipping</span><span>{order.shippingCost === 0 ? "Free" : formatPriceShort(order.shippingCost)}</span></div>
                            <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span>Total</span><span>{formatPriceShort(order.total)}</span></div>
                          </div>
                        </div>

                        {/* Profit / COGS — gross margin on goods sold,
                            computed from per-SKU costs in src/lib/products.ts.
                            Doesn't subtract shipping or processing fees;
                            this is "what we got from the customer for the
                            goods minus what we paid the supplier." Only
                            renders when there are line items. */}
                        {order.items && order.items.length > 0 && (() => {
                          const profit = computeOrderProfit(
                            order.items.map((it) => ({
                              variantSku: it.variantSku,
                              quantity: it.quantity,
                              lineTotal: it.lineTotal,
                            })),
                            { discountCents: order.discount ?? 0 },
                          );
                          const profitClass =
                            profit.profitCents > 0
                              ? "text-success"
                              : profit.profitCents < 0
                              ? "text-red-700"
                              : "text-muted";
                          return (
                            <div>
                              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                                Profit
                              </h4>
                              <div className="text-sm space-y-1 bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                                <div className="flex justify-between"><span className="text-muted">Goods subtotal</span><span>{formatPriceShort(profit.grossRevenueCents)}</span></div>
                                {profit.discountCents > 0 && (
                                  <div className="flex justify-between"><span className="text-muted">Discount</span><span className="text-success">-{formatPriceShort(profit.discountCents)}</span></div>
                                )}
                                <div className="flex justify-between"><span className="text-muted">Net revenue</span><span>{formatPriceShort(profit.revenueCents)}</span></div>
                                <div className="flex justify-between"><span className="text-muted">COGS</span><span>-{formatPriceShort(profit.cogsCents)}</span></div>
                                <div className={`flex justify-between font-semibold border-t border-emerald-200 pt-1 mt-1 ${profitClass}`}>
                                  <span>Gross profit</span>
                                  <span>
                                    {formatPriceShort(profit.profitCents)}
                                    {profit.marginPct != null && (
                                      <span className="ml-1.5 text-xs font-medium opacity-75">({profit.marginPct}%)</span>
                                    )}
                                  </span>
                                </div>
                                {profit.hasMissingCost && (
                                  <p className="text-[10px] text-amber-700 pt-1">
                                    ⚠ One or more line items have no cost on file — gross profit is partial.
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right column */}
                      <div className="space-y-5">
                        {/* Tracking block */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5" /> Shipping & Tracking
                          </h4>
                          {order.trackingNumber ? (
                            <div className="bg-accent/40 border border-border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-mono text-sm font-semibold text-foreground break-all">
                                  {order.trackingNumber}
                                </span>
                                {order.trackingUrl && (
                                  <a
                                    href={order.trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 flex-shrink-0"
                                  >
                                    Track <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className="text-xs text-muted flex flex-wrap gap-x-3 gap-y-0.5">
                                {order.trackingCarrier && (
                                  <span>Carrier: <span className="text-foreground uppercase">{order.trackingCarrier}</span></span>
                                )}
                                {order.trackingMilestone && (
                                  <span>Status: <span className="text-foreground">{order.trackingMilestone.replace(/_/g, " ")}</span></span>
                                )}
                                {order.trackingLastChecked && (
                                  <span>Last checked: <span className="text-foreground">{relativeTime(order.trackingLastChecked)}</span></span>
                                )}
                              </div>
                              {order.trackingLastEvent && (
                                <p className="text-[11px] text-muted italic">“{order.trackingLastEvent}”</p>
                              )}
                              {order.deliveredAt && (
                                <p className="text-xs text-success font-medium">
                                  Delivered {new Date(order.deliveredAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted">Not yet shipped.</p>
                          )}
                        </div>

                        {/* ShipStation handshake.
                            We PUSH paid orders into the fulfillment
                            partner's ShipStation account via
                            pushOrderToShipStation (lib/fulfillment.ts)
                            from every payment-success path. The push
                            uses the partner's SS_STORE_USERNAME /
                            SS_STORE_PASSWORD API credentials and
                            returns the ShipStation order id which we
                            store as shipstationOrderId here. The
                            inbound SHIP_NOTIFY webhook at
                            /api/webhooks/shipstation receives the
                            tracking number back when they ship. */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">ShipStation</h4>
                          {order.shipstationOrderId ? (
                            <div className="text-xs text-foreground">
                              <p>
                                ID <span className="font-mono">{order.shipstationOrderId}</span>
                              </p>
                              {order.shipstationPushedAt && (
                                <p className="text-muted mt-0.5">
                                  Pushed {relativeTime(order.shipstationPushedAt)}
                                </p>
                              )}
                            </div>
                          ) : order.paymentStatus === "completed" ? (
                            <p className="text-xs text-muted">
                              Available for pickup on next ShipStation poll
                              (every ~15-30 min). Click &quot;Refresh from Store&quot;
                              in ShipStation to pull immediately.
                            </p>
                          ) : (
                            <p className="text-xs text-muted">Will be served to ShipStation once payment completes.</p>
                          )}
                        </div>

                        {/* Payment details */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Payment</h4>
                          <div className="text-xs text-foreground space-y-0.5">
                            <p>
                              <span className="text-muted">Gateway:</span>{" "}
                              <span className="uppercase">{order.paymentGateway || "—"}</span>
                              {order.paymentStatus && (
                                <span className="ml-2 text-muted">· {order.paymentStatus}</span>
                              )}
                            </p>
                            {order.paymentReference && (
                              <p>
                                <span className="text-muted">Reference:</span>{" "}
                                <span className="font-mono">{order.paymentReference}</span>
                              </p>
                            )}
                            {order.subscriptionId && (
                              <p className="text-muted">
                                Sub order · <span className="font-mono text-[10px]">{order.subscriptionId.slice(0, 8)}…</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* PostHog — deep-link to the customer's session
                            replay + profile. Lets ops watch exactly what
                            the user did around the time of this order.
                            Only renders when we know the userId (anon
                            checkouts skip this). */}
                        {order.userId && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Session analytics</h4>
                            <a
                              href={`https://us.posthog.com/project/${process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID || "390049"}/persons/${encodeURIComponent(order.userId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              View customer in PostHog <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Fraud flags */}
                        {typeof order.fraudScore === "number" && order.fraudScore >= 40 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-destructive" /> Fraud
                            </h4>
                            <p className="text-xs">
                              Score <span className="font-bold text-destructive">{order.fraudScore}</span>
                              {order.fraudSignals && order.fraudSignals.length > 0 && (
                                <> · {order.fraudSignals.join(", ")}</>
                              )}
                            </p>
                          </div>
                        )}

                        {/* Notes (e.g. ACH decline reason) */}
                        {order.notes && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes</h4>
                            <p className="text-xs text-muted italic">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {order.status === "pending" && (
                        <button
                          onClick={() => updateStatus(order.id, "confirmed")}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                        >
                          Confirm Order
                        </button>
                      )}
                      {order.status === "confirmed" && (
                        <button
                          onClick={() => updateStatus(order.id, "processing")}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 cursor-pointer disabled:opacity-50"
                        >
                          Start Processing
                        </button>
                      )}
                      {(order.status === "processing" || order.status === "confirmed") && (
                        <button
                          onClick={() => {
                            const tracking = prompt("Enter tracking number:");
                            if (tracking) updateTracking(order.id, tracking);
                          }}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 cursor-pointer disabled:opacity-50"
                        >
                          <Truck className="w-3 h-3 inline mr-1" /> Mark Shipped
                        </button>
                      )}
                      {order.status === "shipped" && (
                        <button
                          onClick={() => updateStatus(order.id, "delivered")}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" /> Mark Delivered
                        </button>
                      )}
                      {!["cancelled", "refunded", "delivered"].includes(order.status) && (
                        <button
                          onClick={() => {
                            if (confirm("Cancel this order?")) updateStatus(order.id, "cancelled");
                          }}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3 inline mr-1" /> Cancel
                        </button>
                      )}

                      {/* Refunds and gateway tracking-sync depend on a
                          payment processor, which this template does not
                          wire. Once you integrate one, add a refund action
                          here that calls its refund API. */}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Thank-you SMS button ─────────────────────────────────────
// Per-order click-to-text that opens iMessage with a pre-populated
// confirmation thank-you. POSTs to /api/admin/orders/thank-you-sms
// to stamp `thank_you_sms_sent_at` so we can show "Thanked X ago"
// instead of a fresh button. Re-clicks re-open iMessage AND re-stamp
// (operator might want to follow up with a second message).
function ThankYouSmsButton({
  order,
  onStamped,
}: {
  order: Order;
  onStamped: () => void;
}) {
  const phone = order.customerPhone;
  const sa = order.shippingAddress as { firstName?: string } | null;
  const firstName = sa?.firstName || "there";

  // The SMS body. Kept under ~310 chars so it lands as 2 SMS segments
  // max on Android, 1 iMessage bubble on iOS. Voice convention: no
  // em dashes, no curly quotes; reads as a real human typing.
  const body =
    `Hi ${firstName}, this is Based Research. Just confirming we received your order ` +
    `${order.orderNumber}. Your peptides will ship within 24 hours via UPS 2nd Day Air with cold packs, ` +
    `and we will text you tracking the moment your package leaves our facility. ` +
    `Reply here anytime if you have questions.`;

  // sms: URL with body. iOS uses ?body=, Android requires ?body= too
  // (older Android used ;body= but modern stack is consistent).
  // We URL-encode the body so newlines and special chars survive.
  const smsHref = phone ? `sms:${phone}?&body=${encodeURIComponent(body)}` : null;

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!smsHref) return;
    // Stamp the timestamp via the API. Best-effort — the iMessage
    // open below happens regardless. If the stamp fails the button
    // just stays in the un-stamped state and admin can re-click.
    fetch("/api/admin/orders/thank-you-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    })
      .then(() => onStamped())
      .catch((err) => console.warn("[thank-you-sms] stamp failed:", err));
  };

  if (!smsHref) return null;

  const stampedAt = order.thankYouSmsSentAt;

  return (
    <a
      href={smsHref}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
        stampedAt
          ? "text-success hover:underline"
          : "text-primary hover:underline"
      }`}
      title={
        stampedAt
          ? `Already sent ${relativeTime(stampedAt)}. Click to re-send.`
          : "Open iMessage with a thank-you pre-populated"
      }
    >
      {stampedAt ? (
        <>
          <CheckCircle className="w-3 h-3" /> Thanked {relativeTime(stampedAt)}
        </>
      ) : (
        <>
          <MessageSquare className="w-3 h-3" /> Send thank-you
        </>
      )}
    </a>
  );
}

// ── USERS TAB ───────────────────────────────────────────────
function UsersTab({
  users, loading, search, setSearch,
}: {
  users: AdminUser[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-serif text-foreground mb-6">Customers</h1>

      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading customers...</p>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <Users className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted">No customers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Phone</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Interested In</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3" title="First-touch attribution: UTM source, referrer, or landing page from the customer's earliest completed order.">Source</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Signup Location</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const hasPurchased = u.interests.some((i) => i.purchased);
                const purchasedCount = u.interests.filter((i) => i.purchased).length;
                return (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>
                        {u.firstName || u.lastName
                          ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                          : "—"}
                      </span>
                      {/* Buyer / Lead pill — at-a-glance signal of who has
                          paid us money vs. who's still cold. The pill
                          tooltip shows the exact purchased SKU count. */}
                      {hasPurchased ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success uppercase tracking-wider"
                          title={`Purchased ${purchasedCount} ${purchasedCount === 1 ? "product" : "products"}`}
                        >
                          ✓ Buyer
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-muted uppercase tracking-wider"
                          title="No purchase on file yet"
                        >
                          Lead
                        </span>
                      )}
                      {u.hasEin && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider"
                          title="EIN / Tax ID on file (encrypted)"
                        >
                          EIN
                        </span>
                      )}
                    </div>
                    {/* Business identifiers captured at signup. Company name
                        + business type sit under the name for at-a-glance B2B
                        context. */}
                    {(u.companyName || u.businessType) && (
                      <div className="mt-0.5 text-[11px] text-muted leading-tight">
                        {u.companyName && <span className="text-foreground/70">{u.companyName}</span>}
                        {u.companyName && u.businessType && <span className="text-muted/50"> </span>}
                        {u.businessType && <span>{businessTypeLabel(u.businessType)}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted">
                    {u.email ? (
                      <a
                        href={`mailto:${u.email}`}
                        className="hover:text-primary hover:underline select-text"
                        title={`Email ${u.email}`}
                      >
                        {u.email}
                      </a>
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted whitespace-nowrap font-mono">
                    {u.phone ? (
                      <div className="flex items-center gap-2">
                        {/* sms: opens iMessage / Messages directly. tel:
                            opens the dialer (call) which is rarely what
                            we want for outreach. */}
                        <a
                          href={`sms:${u.phone}`}
                          className="hover:text-primary hover:underline select-text"
                          title={`Text ${u.phone}`}
                        >
                          {formatPhoneDisplay(u.phone)}
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            handleOutreachClick({
                              id: u.id,
                              phone: u.phone!,
                              firstName: u.firstName,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-sans font-medium hover:bg-primary/15 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none transition-colors cursor-pointer"
                          title="Send a pre-filled intro message via iMessage / SMS"
                          aria-label={`Text ${u.firstName || u.email}`}
                        >
                          <MessageSquare className="w-3 h-3" aria-hidden="true" />
                          Text
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 max-w-[280px]">
                    <CustomerInterests interests={u.interests} />
                  </td>
                  <td className="px-5 py-3.5">
                    <CustomerSource acquisition={u.acquisition} />
                  </td>
                  <td
                    className="px-5 py-3.5 text-sm text-muted whitespace-nowrap"
                    title={u.signupIp ? `IP: ${u.signupIp}` : "IP not captured"}
                  >
                    {u.signupCountry ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-base leading-none" aria-hidden="true">
                          {countryFlag(u.signupCountry)}
                        </span>
                        <span>{formatLocation(u)}</span>
                      </span>
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      u.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent text-muted"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted whitespace-nowrap">
                    {(() => {
                      const j = formatJoinedAt(u.createdAt);
                      return (
                        <span title={j.absolute}>{j.display}</span>
                      );
                    })()}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── MESSAGES TAB ───────────────────────────────────────────
// Inbox for everything that POSTs to /api/contact: support-bubble
// chat, COA-page request form, and the standalone /contact page.
// Subjects disambiguate the source ("COA Request" vs "Order Support"
// vs "Product Question" etc.).
function MessagesTab({
  messages,
  loading,
  search,
  setSearch,
  onRefresh,
}: {
  messages: ContactMessage[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  onRefresh: () => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "read" | "replied" | "archived">("all");

  const visible = statusFilter === "all"
    ? messages
    : messages.filter((m) => m.status === statusFilter);

  const updateStatus = async (id: string, status: ContactMessage["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("[messages] status update failed", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-foreground">Messages</h1>
        <button
          type="button"
          onClick={onRefresh}
          className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search name, email, message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(["all", "new", "read", "replied", "archived"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/40 text-muted hover:bg-accent hover:text-foreground"
              }`}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && messages.length === 0 ? (
        <p className="text-sm text-muted">Loading messages...</p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <MessageSquare className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted">
            {statusFilter === "all"
              ? "No messages yet."
              : `No ${statusFilter} messages.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
          {visible.map((m) => {
            const isOpen = expanded === m.id;
            const ageMin = Math.round(
              (Date.now() - new Date(m.createdAt).getTime()) / 60000,
            );
            const ageLabel = ageMin < 60
              ? `${ageMin}m ago`
              : ageMin < 60 * 24
                ? `${Math.round(ageMin / 60)}h ago`
                : `${Math.round(ageMin / (60 * 24))}d ago`;

            return (
              <div key={m.id} className="p-5 hover:bg-accent/10 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      const next = isOpen ? null : m.id;
                      setExpanded(next);
                      // Auto-mark "new" → "read" the first time admin opens it
                      if (next && m.status === "new") {
                        updateStatus(m.id, "read");
                      }
                    }}
                    className="flex-1 text-left cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {m.name}
                      </span>
                      <span className="text-xs text-muted">{m.email}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.subject === "COA Request"
                          ? "bg-secondary/10 text-secondary"
                          : "bg-accent text-muted"
                      }`}>
                        {m.subject}
                      </span>
                      {m.status === "new" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                          New
                        </span>
                      )}
                      {m.status === "replied" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success uppercase tracking-wider">
                          Replied
                        </span>
                      )}
                      {m.status === "archived" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/10 text-muted uppercase tracking-wider">
                          Archived
                        </span>
                      )}
                      <span className="text-[11px] text-muted ml-auto">{ageLabel}</span>
                    </div>
                    <p className={`text-sm text-foreground/80 ${isOpen ? "" : "line-clamp-2"} whitespace-pre-wrap`}>
                      {m.message}
                    </p>
                    {m.orderNumber && (
                      <p className="text-[11px] text-muted mt-1 font-mono">
                        Lot/Order ref: {m.orderNumber}
                      </p>
                    )}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      Reply by email
                    </a>
                    {m.status !== "replied" && (
                      <button
                        type="button"
                        disabled={updatingId === m.id}
                        onClick={() => updateStatus(m.id, "replied")}
                        className="px-3 py-1.5 rounded-md bg-accent text-foreground text-xs font-medium hover:bg-accent/80 disabled:opacity-50 cursor-pointer"
                      >
                        Mark as replied
                      </button>
                    )}
                    {m.status !== "archived" && (
                      <button
                        type="button"
                        disabled={updatingId === m.id}
                        onClick={() => updateStatus(m.id, "archived")}
                        className="px-3 py-1.5 rounded-md bg-accent text-muted text-xs font-medium hover:bg-accent/80 disabled:opacity-50 cursor-pointer"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── WHOLESALE TAB ──────────────────────────────────────────
function WholesaleTab({ accounts, loading, onRefresh }: { accounts: WholesaleAccount[]; loading: boolean; onRefresh: () => void }) {
  const [updating, setUpdating] = useState<string | null>(null);

  const updateAccount = async (accountId: string, updates: Record<string, unknown>) => {
    setUpdating(accountId);
    try {
      await fetch("/api/admin/wholesale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, ...updates }),
      });
      onRefresh();
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    suspended: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-foreground">Wholesale Accounts</h1>
        <button onClick={onRefresh} className="text-muted hover:text-foreground transition-colors cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No wholesale applications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{a.companyName}</p>
                  <p className="text-xs text-muted">{a.userName} · {a.userEmail}</p>
                  <p className="text-xs text-muted mt-0.5 capitalize">{a.institutionType.replace("_", " ")} · Est. {a.estimatedMonthlyVolume || "N/A"}/mo</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColors[a.status] || ""}`}>{a.status}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted mb-3">
                <span>Tier {a.tier}</span>
                <span>{a.discountPercent}% off</span>
                <span className="capitalize">{a.creditTerms.replace("net", "Net ")}</span>
                {a.outstandingBalance > 0 && <span className="text-amber-600">Outstanding: {formatPriceShort(a.outstandingBalance)}</span>}
              </div>

              {a.status === "pending" && (
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => updateAccount(a.id, { status: "approved" })}
                    disabled={updating === a.id}
                    className="text-xs font-medium text-success hover:underline cursor-pointer disabled:opacity-50"
                  >Approve</button>
                  <button
                    onClick={() => updateAccount(a.id, { status: "rejected" })}
                    disabled={updating === a.id}
                    className="text-xs font-medium text-destructive hover:underline cursor-pointer disabled:opacity-50"
                  >Reject</button>
                </div>
              )}

              {a.status === "approved" && (
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => {
                      const newTier = prompt(`Current tier: ${a.tier}. Enter new tier (1-4):`, String(a.tier));
                      if (newTier) updateAccount(a.id, { tier: parseInt(newTier), discountPercent: [20, 22, 25, 25][parseInt(newTier) - 1] || 20 });
                    }}
                    disabled={updating === a.id}
                    className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                  >Change Tier</button>
                  <button
                    onClick={() => {
                      const terms = prompt("Credit terms (prepaid/net15/net30/net60):", a.creditTerms);
                      if (terms) updateAccount(a.id, { creditTerms: terms });
                    }}
                    disabled={updating === a.id}
                    className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                  >Change Terms</button>
                  <button
                    onClick={() => updateAccount(a.id, { status: "suspended" })}
                    disabled={updating === a.id}
                    className="text-xs font-medium text-destructive hover:underline cursor-pointer disabled:opacity-50"
                  >Suspend</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SETTINGS TAB ────────────────────────────────────────────
interface SiteSettingsState {
  bump_offer_enabled: boolean;
}

interface BumpStats {
  days: number;
  shown: number;
  accepted: number;
  takeRate: number;
  revenueCents: number;
}

function SettingsTab() {
  const [settings, setSettings] = useState<SiteSettingsState | null>(null);
  const [stats, setStats] = useState<BumpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statsDays, setStatsDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        fetch("/api/admin/settings").then((r) => r.json()),
        fetch(`/api/admin/bump-stats?days=${statsDays}`).then((r) => r.json()),
      ]);
      if (s.settings) setSettings(s.settings);
      if (typeof b.shown === "number") setStats(b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statsDays]);

  useEffect(() => { load(); }, [load]);

  const toggleBump = async (next: boolean) => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "bump_offer_enabled", value: next }),
      });
      setSettings((s) => (s ? { ...s, bump_offer_enabled: next } : s));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-serif text-foreground mb-6">Settings</h1>

      {/* Bump offer */}
      <div className="bg-white rounded-xl border border-border p-6 mb-4 max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Bump Offer
            </h2>
            <p className="text-sm text-muted">
              Inline add-to-order checkbox shown on the final step of checkout. Rolls into the same payment. Current product: Portable Peptide Storage Fridge.
            </p>
          </div>
          <label className="inline-flex items-center gap-3 cursor-pointer flex-shrink-0">
            <span className="text-sm font-medium text-foreground">
              {settings?.bump_offer_enabled ? "On" : "Off"}
            </span>
            <input
              type="checkbox"
              checked={!!settings?.bump_offer_enabled}
              disabled={loading || saving}
              onChange={(e) => toggleBump(e.target.checked)}
              className="w-10 h-5 accent-primary cursor-pointer"
            />
          </label>
        </div>

        {/* Stats strip */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Take rate (last {statsDays}d)</span>
            <select
              value={statsDays}
              onChange={(e) => setStatsDays(parseInt(e.target.value, 10))}
              className="text-xs border border-border rounded-md px-2 py-1 bg-white cursor-pointer"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          {!stats ? (
            <p className="text-sm text-muted">Loading stats...</p>
          ) : stats.shown === 0 ? (
            <p className="text-sm text-muted">No bump impressions yet in this window.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider">Shown</p>
                <p className="text-xl font-bold text-foreground">{stats.shown}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider">Accepted</p>
                <p className="text-xl font-bold text-foreground">{stats.accepted}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider">Take Rate</p>
                <p className="text-xl font-bold text-primary">{(stats.takeRate * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase tracking-wider">Revenue</p>
                <p className="text-xl font-bold text-success">${(stats.revenueCents / 100).toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AFFILIATES TAB ─────────────────────────────────────────
function AffiliatesTab({ affiliates, loading, onRefresh }: { affiliates: AffiliateRow[]; loading: boolean; onRefresh: () => void }) {
  const [updating, setUpdating] = useState<string | null>(null);
  // Create-affiliate modal lives here so its open state survives table
  // re-renders triggered by row edits below it.
  const [createOpen, setCreateOpen] = useState(false);

  const updateAffiliate = async (affiliateId: string, updates: Record<string, unknown>) => {
    setUpdating(affiliateId);
    try {
      await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId, ...updates }),
      });
      onRefresh();
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif text-foreground">Affiliates</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Affiliate
          </button>
          <button onClick={onRefresh} className="text-muted hover:text-foreground transition-colors cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {createOpen && (
        <CreateAffiliateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            onRefresh();
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : affiliates.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center">
          <Link2 className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No affiliates yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border bg-accent/30">
                <th className="px-4 py-3 font-medium">Affiliate</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Clicks</th>
                <th className="px-4 py-3 font-medium">Signups</th>
                <th className="px-4 py-3 font-medium">CR</th>
                <th className="px-4 py-3 font-medium">Earned</th>
                <th className="px-4 py-3 font-medium">Pending</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <AffiliateRowItem
                  key={a.id}
                  affiliate={a}
                  updating={updating === a.id}
                  updateAffiliate={updateAffiliate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Per-row affiliate component. Pulled out of AffiliatesTab so each row
// can own its own expand/collapse state for the application-notes
// drawer (one shared `expandedId` would force a re-render of every row
// on click, which is wasteful for a small table but compounds as the
// affiliate list grows).
function AffiliateRowItem({
  affiliate: a,
  updating,
  updateAffiliate,
}: {
  affiliate: AffiliateRow;
  updating: boolean;
  updateAffiliate: (id: string, updates: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasNotes = !!a.applicationNotes && a.applicationNotes.trim().length > 0;

  return (
    <>
      <tr className="border-b border-border/50 last:border-0 hover:bg-accent/20">
        <td className="px-4 py-3">
          <p className="text-foreground">{a.userName}</p>
          {/* Email + phone surfaced inline with click-to-mail / click-to-text. */}
          <div className="text-[11px] text-muted flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {a.userEmail && (
              <a href={`mailto:${a.userEmail}`} className="hover:text-primary hover:underline">{a.userEmail}</a>
            )}
            {a.userPhone ? (
              <a href={`sms:${a.userPhone}`} className="hover:text-primary hover:underline">
                📱 {a.userPhone}
              </a>
            ) : (
              <span className="text-amber-600" title="No phone on file. Pre-application-form affiliate — reach out via email to collect.">no phone</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-foreground">
          <div>{a.affiliateCode}</div>
          {/* Referral link with one-click copy. ?ref=CODE auto-applies
              the discount at the cart layer (CartProvider effect) so
              admin can hand this URL out and the customer's experience
              is one click, no manual coupon entry. */}
          <ReferralLinkCopy code={a.affiliateCode} />
        </td>
        <td className="px-4 py-3 text-foreground">{(parseFloat(a.commissionRate) * 100).toFixed(0)}%</td>
        <td className="px-4 py-3 text-foreground tabular-nums">{a.clickCount}</td>
        <td className="px-4 py-3 text-foreground tabular-nums">{a.referralCount}</td>
        <td className="px-4 py-3 text-muted tabular-nums">
          {a.clickConversionPct != null ? `${a.clickConversionPct}%` : "—"}
        </td>
        <td className="px-4 py-3 text-success">{formatPriceShort(a.totalEarned)}</td>
        <td className="px-4 py-3 text-foreground">{formatPriceShort(a.pendingBalance)}</td>
        <td className="px-4 py-3">
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
            a.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>{a.status}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded((v) => !v)}
              className={`text-[11px] hover:underline cursor-pointer ${hasNotes ? "text-primary" : "text-muted"}`}
              title={hasNotes ? "View application notes" : "No application notes (pre-form affiliate)"}
            >
              {hasNotes ? (expanded ? "Hide" : "View") : "—"}
            </button>
            <button
              onClick={() => {
                const rate = prompt(`Current rate: ${(parseFloat(a.commissionRate) * 100).toFixed(0)}%. Enter new rate (0-100):`, String((parseFloat(a.commissionRate) * 100).toFixed(0)));
                if (rate) updateAffiliate(a.id, { commissionRate: parseFloat(rate) / 100 });
              }}
              disabled={updating}
              className="text-[11px] text-primary hover:underline cursor-pointer disabled:opacity-50"
            >Rate</button>
            <button
              onClick={() => updateAffiliate(a.id, { status: a.status === "active" ? "suspended" : "active" })}
              disabled={updating}
              className={`text-[11px] hover:underline cursor-pointer disabled:opacity-50 ${a.status === "active" ? "text-destructive" : "text-success"}`}
            >{a.status === "active" ? "Suspend" : "Activate"}</button>
          </div>
        </td>
      </tr>
      {expanded && hasNotes && (
        <tr className="bg-accent/30 border-b border-border/50">
          <td colSpan={10} className="px-4 py-4">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Application notes</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed bg-card border border-border rounded-lg p-3">{a.applicationNotes}</pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Compact referral-link display with one-click copy + open-in-new-tab.
// Lives inside the affiliate-code cell on each row so admin can grab a
// partner's link without composing the URL manually. The link uses
// /?ref=CODE which the CartProvider auto-applies at checkout.
function ReferralLinkCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  // Site URL fallback matches what /api/affiliate uses on the dashboard.
  const url = `https://basedresearch.com/?ref=${code}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select-and-copy via a hidden input. Modern browsers
      // gate clipboard API on HTTPS + user gesture; we ARE in a user
      // gesture here so this almost always works.
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-normal text-muted">
      <button
        onClick={onCopy}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
          copied
            ? "border-success bg-success/10 text-success"
            : "border-border bg-card hover:border-border-strong text-muted hover:text-foreground"
        }`}
        title="Copy affiliate link"
      >
        {copied ? <CheckCircle className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary hover:underline truncate max-w-[200px]"
        title={url}
      >
        ?ref={code}
      </a>
    </div>
  );
}

// ── CREATE NEW AFFILIATE MODAL ─────────────────────────────
//
// Modal form that lets admin onboard a partner directly without going
// through the public /affiliate/signup flow. Posts to
// POST /api/admin/affiliates which finds-or-creates the user record and
// inserts the affiliate row with status="active" so the code works
// immediately.
//
// Form fields mirror the API schema 1:1. Validation is intentionally
// loose on the client (server is the source of truth) — we just gate
// on "looks like an email", "code is alphanumeric", "rate is a sane
// percent". The server returns the specific error message verbatim
// if it rejects, which we surface inline.
function CreateAffiliateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  // Stored as the user-typed integer (e.g. "20" for 20%) — converted to
  // a 0..1 decimal at submit time to match the server's commissionRate
  // contract. Defaulted to 20 since that's the most common rate.
  const [commissionPct, setCommissionPct] = useState(20);
  const [discountPct, setDiscountPct] = useState<string>("15");
  const [payoutMethod, setPayoutMethod] = useState<"crypto" | "ach">("crypto");
  const [applicationNotes, setApplicationNotes] = useState("");
  const [sendApprovalEmail, setSendApprovalEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    firstName.trim().length > 0 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) &&
    /^[A-Za-z0-9]{3,30}$/.test(affiliateCode) &&
    Number.isFinite(commissionPct) &&
    commissionPct >= 0 &&
    commissionPct <= 100;

  const submit = async () => {
    if (!isValid) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          affiliateCode: affiliateCode.trim().toUpperCase(),
          commissionRate: commissionPct / 100,
          couponDiscountPercent:
            discountPct.trim() === "" ? null : Number(discountPct),
          payoutMethod,
          applicationNotes: applicationNotes.trim() || undefined,
          sendApprovalEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      onCreated();
    } catch (err) {
      setError((err as Error).message || "Network error");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">New Affiliate</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">First name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary"
                placeholder="Russo"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary"
              placeholder="partner@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Phone <span className="text-muted">(E.164, optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary"
              placeholder="+17866428624"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Affiliate code * <span className="text-muted">(3-30 chars, alphanumeric)</span>
            </label>
            <input
              type="text"
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={30}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary uppercase font-mono"
              placeholder="JANE10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Commission % *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-muted mt-1">% of order paid to partner</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Customer discount %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary"
                placeholder="leave blank for default"
              />
              <p className="text-[10px] text-muted mt-1">% off cart for code users</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Payout method</label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as "crypto" | "ach")}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary bg-white"
            >
              <option value="crypto">Crypto (USDC)</option>
              <option value="ach">ACH (US bank)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Internal notes <span className="text-muted">(optional)</span>
            </label>
            <textarea
              value={applicationNotes}
              onChange={(e) => setApplicationNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-primary resize-none"
              placeholder="Where they came from, audience size, deal terms — admin-only."
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendApprovalEmail}
              onChange={(e) => setSendApprovalEmail(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              Send approval email immediately
              <span className="block text-[11px] text-muted mt-0.5">
                Includes their custom link, payout instructions, and the customer-discount %.
              </span>
            </span>
          </label>
        </div>

        <div className="px-5 py-3 border-t border-border bg-accent/20 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!isValid || submitting}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Create Affiliate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
