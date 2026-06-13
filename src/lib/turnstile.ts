/**
 * Cloudflare Turnstile server-side validator.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * Env vars:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — exposed to browser; put widget-display key here
 *   TURNSTILE_SECRET_KEY           — server-only; used to verify tokens
 *
 * Cloudflare provides test keys that always pass — we default to these so the
 * widget works out-of-the-box for local dev:
 *   Site key:   1x00000000000000000000AA (always passes)
 *   Secret:     1x0000000000000000000000000000000AA (always passes)
 *
 * Swap in real keys from https://dash.cloudflare.com/?to=/:account/turnstile
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const TEST_SECRET = "1x0000000000000000000000000000000AA";

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Verify a Turnstile token submitted from the client.
 * @param token - value from the hidden cf-turnstile-response input
 * @param remoteIp - client IP (optional but recommended)
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  if (!token) {
    return { success: false, error: "Missing verification token." };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY || TEST_SECRET;

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) {
      return { success: false, error: "Verification service unavailable." };
    }

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: data["error-codes"]?.join(", ") || "Verification failed.",
    };
  } catch (err) {
    console.error("Turnstile verify error:", err);
    return { success: false, error: "Verification failed." };
  }
}

/**
 * Public-facing site key accessor. Defaults to the Cloudflare test key which
 * always passes — allows the widget to render in dev without setup.
 */
export function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
}
