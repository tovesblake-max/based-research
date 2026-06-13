/**
 * `/membership` is no longer a real page — the standalone marketing
 * surface used to live here, but we've consolidated "membership" into
 * the actual sign-up flow. This file is a permanent server-side
 * redirect so every inbound link (header nav, in-body CTAs on
 * /about and product pages, bookmarks, organic search) lands the
 * visitor on the form that actually creates an account.
 *
 * If we ever want a marketing landing page back, restore the prior
 * version from git history.
 */

import { permanentRedirect } from "next/navigation";

export default function MembershipPage(): never {
  // 308 Permanent Redirect — search engines update their index to
  // /auth/sign-up, and the browser caches the redirect so a return
  // visit doesn't need to re-fetch this route.
  permanentRedirect("/auth/sign-up");
}
