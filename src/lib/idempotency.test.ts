import { describe, it, expect } from "vitest";
import { isValidIdempotencyKey } from "./idempotency";

describe("isValidIdempotencyKey", () => {
  it("accepts a standard crypto.randomUUID()", () => {
    // Canonical v4 UUID shape
    expect(isValidIdempotencyKey("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts hex-only strings at the min length", () => {
    expect(isValidIdempotencyKey("0123456789abcdef")).toBe(true); // 16 chars
  });

  it("accepts hex-only strings at the max length", () => {
    expect(isValidIdempotencyKey("a".repeat(64))).toBe(true);
  });

  it("accepts uppercase hex", () => {
    expect(isValidIdempotencyKey("DEADBEEFCAFEBABE")).toBe(true);
  });

  it("rejects non-string inputs", () => {
    expect(isValidIdempotencyKey(null)).toBe(false);
    expect(isValidIdempotencyKey(undefined)).toBe(false);
    expect(isValidIdempotencyKey(123)).toBe(false);
    expect(isValidIdempotencyKey({})).toBe(false);
    expect(isValidIdempotencyKey([])).toBe(false);
  });

  it("rejects strings that are too short", () => {
    expect(isValidIdempotencyKey("deadbeef")).toBe(false); // 8 chars
    expect(isValidIdempotencyKey("abc")).toBe(false);
  });

  it("rejects strings that are too long", () => {
    expect(isValidIdempotencyKey("a".repeat(65))).toBe(false);
    expect(isValidIdempotencyKey("a".repeat(128))).toBe(false);
  });

  it("rejects non-hex characters (prevents injection via the key)", () => {
    expect(isValidIdempotencyKey("not-a-uuid-value-xy")).toBe(false);
    expect(isValidIdempotencyKey("abcdef1234567890'; DROP TABLE orders;--")).toBe(false);
    expect(isValidIdempotencyKey("1234567890123456\n")).toBe(false);
    expect(isValidIdempotencyKey("1234567890123456 ")).toBe(false);
    // 'g' is not valid hex
    expect(isValidIdempotencyKey("g234567890123456")).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidIdempotencyKey("")).toBe(false);
  });
});
