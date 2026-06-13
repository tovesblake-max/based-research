"use client";

// PostHog client-side provider.
//
// Initialises the browser SDK, captures pageviews + autocapture events,
// and records sessions with aggressive input masking so we never leak
// bank routing/account numbers or card PAN into replay storage.
//
// Architecture notes:
//   - Requests are routed through /ingest/* (see next.config.ts rewrites)
//     so the PostHog host isn't hit directly from the browser. This bypasses
//     ad blockers that blocklist posthog.com. ~8% capture lift typical.
//   - Admin routes opt out of session replay entirely — admins look at
//     customer PII all day and we don't want that in replays.
//   - The checkout page sets data-ph-no-capture on every bank field; we
//     also enable maskAllInputs as belt-and-suspenders.

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProviderBase } from "posthog-js/react";
import { useAuth } from "@/components/AuthProvider";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

// One-time init — `posthog.__loaded` guards against StrictMode double-init
// in dev.
function initPostHog() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  if ((posthog as unknown as { __loaded?: boolean }).__loaded) return;

  const isAdminRoute =
    typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  posthog.init(POSTHOG_KEY, {
    // First-party reverse proxy — see next.config.ts for the rewrite rules.
    api_host: "/ingest",
    ui_host: POSTHOG_HOST,
    // Autocapture clicks + form submits + page views on every non-admin
    // route. Admin clicks would just be noise.
    autocapture: !isAdminRoute,
    capture_pageview: true,
    capture_pageleave: true,
    // Session replay with defense-in-depth masking:
    //   - maskAllInputs: every <input>/<textarea>/<select> is masked by
    //     default. Individual fields can opt in with data-ph-unmask if
    //     needed (we don't opt any in).
    //   - blockSelector: pages on which we never want recording at all.
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: false, // email is not treated as PII here — helps segmentation
      },
      // Explicitly block any element annotated data-ph-no-capture, plus
      // anything inside /admin or any embedded payment iframe.
      blockSelector: '[data-ph-no-capture], [data-ph-no-capture] *, iframe',
    },
    // Only record sessions that started checkout or are on a research
    // landing page — those are the ones we actually want to study. Saves
    // us the storage + privacy footprint of recording catalog browsing.
    disable_session_recording: isAdminRoute,
    // Privacy knobs
    person_profiles: "identified_only", // don't create ghost profiles for anon browsers
    respect_dnt: true,
    opt_out_useragent_filter: true, // drop known bot UAs automatically
  });
}

/**
 * Track page navigations manually — App Router doesn't trigger a full
 * page load on client-side navigation, so PostHog's default history-based
 * pageview capture misses them without this hook.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Associate the anonymous session with the authenticated user as soon as
 * we know who they are. Called on every auth state change.
 */
function IdentifyOnLogin() {
  const { user } = useAuth();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (!user) return;
    posthog.identify(user.id, {
      email: user.email || undefined,
      firstName: user.firstName || undefined,
      role: user.role,
    });
  }, [user]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  // Bypass the provider entirely if the key isn't configured — avoids
  // runtime errors in local dev without PostHog set up.
  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProviderBase client={posthog}>
      {/* PageViewTracker uses usePathname/useSearchParams. Wrapping it
          in a tightly-scoped Suspense keeps Next.js's static-render
          bailout from dragging {children} along when those hooks
          suspend. (Outer Suspense in layout.tsx isn't enough — Suspense
          siblings still get suspended together.) */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <IdentifyOnLogin />
      {children}
    </PHProviderBase>
  );
}
