import { describe, it, expect } from "vitest";
import {
  computeShippingCents,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_CENTS,
  ACH_DISCOUNT_RATE,
  getActiveTier,
  getDiscountedPrice,
} from "./discounts";

describe("computeShippingCents", () => {
  it("charges the flat rate below the threshold", () => {
    expect(computeShippingCents(0)).toBe(FLAT_SHIPPING_CENTS);
    expect(computeShippingCents(1000)).toBe(FLAT_SHIPPING_CENTS);
    expect(computeShippingCents(FREE_SHIPPING_THRESHOLD - 1)).toBe(FLAT_SHIPPING_CENTS);
  });

  it("is free at and above the threshold", () => {
    expect(computeShippingCents(FREE_SHIPPING_THRESHOLD)).toBe(0);
    expect(computeShippingCents(FREE_SHIPPING_THRESHOLD + 1)).toBe(0);
    expect(computeShippingCents(1_000_000)).toBe(0);
  });

  it("is free when allNoShipping is true regardless of subtotal", () => {
    expect(computeShippingCents(0, true)).toBe(0);
    expect(computeShippingCents(1000, true)).toBe(0);
    expect(computeShippingCents(FREE_SHIPPING_THRESHOLD, true)).toBe(0);
  });
});

describe("ACH_DISCOUNT_RATE", () => {
  it("is 5%", () => {
    expect(ACH_DISCOUNT_RATE).toBe(0.05);
  });

  it("produces the expected discount on a $100 subtotal", () => {
    const subtotalCents = 10000;
    expect(Math.round(subtotalCents * ACH_DISCOUNT_RATE)).toBe(500);
  });
});

describe("volume discount tiers", () => {
  it("applies no discount below qty 3", () => {
    expect(getActiveTier(1)).toBeNull();
    expect(getActiveTier(2)).toBeNull();
  });

  it("applies 5% at qty 3-4", () => {
    const tier = getActiveTier(3);
    expect(tier?.discountPercent).toBe(5);
    expect(getActiveTier(4)?.discountPercent).toBe(5);
  });

  it("applies 10% at qty 5-9", () => {
    expect(getActiveTier(5)?.discountPercent).toBe(10);
    expect(getActiveTier(9)?.discountPercent).toBe(10);
  });

  it("applies 15% at qty 10+", () => {
    expect(getActiveTier(10)?.discountPercent).toBe(15);
    expect(getActiveTier(100)?.discountPercent).toBe(15);
  });

  it("matches the best tier, not the first", () => {
    // Previous bug would have matched the qty=3 tier even at qty=20.
    expect(getActiveTier(20)?.discountPercent).toBe(15);
  });
});

describe("getDiscountedPrice", () => {
  it("returns base price when no tier applies", () => {
    expect(getDiscountedPrice(10000, 1)).toBe(10000);
  });

  it("applies tier discounts and rounds cents", () => {
    // $100 unit, qty 5 → 10% off → $90/unit
    expect(getDiscountedPrice(10000, 5)).toBe(9000);
    // $129 unit, qty 10 → 15% off → $109.65 = 10965 cents
    expect(getDiscountedPrice(12900, 10)).toBe(10965);
  });
});
