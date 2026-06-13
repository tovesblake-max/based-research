import { z } from "zod";

/**
 * Shared checkout primitives — the order-number generator and the
 * shipping-address validation schema used by the checkout route.
 *
 * Kept as a single source of truth so the order-number format and the
 * shippingAddress contract live in one place.
 */

/**
 * Brand-standard order number: `BR-<base36 time><base36 rand>`.
 * Self-consistent per order; the customer-facing reference everywhere.
 */
export function generateOrderNumber(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BR-${now}${rand}`;
}

// Optional business shipping details captured at checkout. Stored on the
// order's shippingAddress JSON; never required so guest/returning flows
// are unaffected.
const businessShippingFields = {
  companyName: z.string().max(255).optional(),
  companyEmail: z.string().max(255).optional(),
  department: z.string().max(60).optional(),
};

/**
 * Checkout shippingAddress. firstName/lastName are required — the name
 * comes from the account / saved address. Server-revalidated.
 */
export const gatedShippingAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().default("US"),
  ...businessShippingFields,
});

/**
 * Guest checkout shippingAddress. Name is collected in a separate
 * `customer` object, so it is absent here. Length caps guard the
 * untrusted public form.
 */
export const expressShippingAddressSchema = z.object({
  address1: z.string().min(1).max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  zip: z.string().min(1).max(20),
  country: z.string().default("US"),
  ...businessShippingFields,
});
