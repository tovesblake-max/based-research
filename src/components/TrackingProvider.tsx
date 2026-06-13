"use client";

import { createContext, useContext, useEffect, useCallback, useRef, ReactNode, Suspense } from "react";
import { useConsent } from "./ConsentProvider";
import { usePathname } from "next/navigation";
import { initAcquisitionTracker } from "@/lib/acquisition";

interface TrackingEvent {
  event: string;
  eventId?: string;
  email?: string;
  productId?: string;
  productName?: string;
  value?: number;
  quantity?: number;
  category?: string;
}

interface TrackingContextType {
  track: (event: TrackingEvent) => void;
}

const TrackingContext = createContext<TrackingContextType>({
  track: () => {},
});

// ── Pixel loader (client-side, consent-gated) ──────────────
function loadPixels() {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const redditPixelId = process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID;

  // Meta Pixel
  if (metaPixelId && !document.getElementById("meta-pixel")) {
    const script = document.createElement("script");
    script.id = "meta-pixel";
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','${metaPixelId}');
    `;
    document.head.appendChild(script);
  }

  // TikTok Pixel
  if (tiktokPixelId && !document.getElementById("tiktok-pixel")) {
    const script = document.createElement("script");
    script.id = "tiktok-pixel";
    script.innerHTML = `
      !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=
      ["page","track","identify","instances","debug","on","off","once","ready","alias",
      "group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=
      function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);
      return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",
      o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},
      ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var i=d.createElement("script");
      i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(i,a)};ttq.load('${tiktokPixelId}');}(window,document,'ttq');
    `;
    document.head.appendChild(script);
  }

  // Reddit Pixel
  if (redditPixelId && !document.getElementById("reddit-pixel")) {
    const script = document.createElement("script");
    script.id = "reddit-pixel";
    script.innerHTML = `
      !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?
      p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];
      var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",
      t.async=!0;var s=d.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(t,s)}}(window,document);
      rdt('init','${redditPixelId}');
    `;
    document.head.appendChild(script);
  }
}

// ── Fire client-side pixel events (deduped with eventId) ───
function fireClientPixels(event: TrackingEvent) {
  const w = window as unknown as Record<string, unknown>;

  // Meta
  if (typeof w.fbq === "function") {
    const fbq = w.fbq as (...args: unknown[]) => void;
    if (event.event === "PageView") {
      fbq("track", "PageView", {}, { eventID: event.eventId });
    } else {
      fbq("track", event.event, {
        content_name: event.productName,
        content_ids: event.productId ? [event.productId] : undefined,
        content_type: "product",
        value: event.value ? (event.value / 100).toFixed(2) : undefined,
        currency: "USD",
        num_items: event.quantity,
      }, { eventID: event.eventId });
    }
  }

  // TikTok
  if (typeof w.ttq !== "undefined") {
    const ttq = w.ttq as { track: (...args: unknown[]) => void; page: () => void };
    const tiktokMap: Record<string, string> = {
      PageView: "Pageview",
      ViewContent: "ViewContent",
      AddToCart: "AddToCart",
      InitiateCheckout: "InitiateCheckout",
      CompleteRegistration: "CompleteRegistration",
      Contact: "SubmitForm",
      Lead: "CompleteRegistration",
    };
    if (event.event === "PageView") {
      ttq.page();
    } else {
      ttq.track(tiktokMap[event.event] || event.event, {
        content_id: event.productId,
        content_name: event.productName,
        value: event.value ? (event.value / 100).toFixed(2) : undefined,
        currency: "USD",
        quantity: event.quantity,
      });
    }
  }

  // Reddit
  if (typeof w.rdt === "function") {
    const rdt = w.rdt as (...args: unknown[]) => void;
    const redditMap: Record<string, string> = {
      PageView: "PageVisit",
      ViewContent: "ViewContent",
      AddToCart: "AddToCart",
      InitiateCheckout: "AddToCart",
      CompleteRegistration: "SignUp",
      Contact: "Lead",
      Lead: "SignUp",
    };
    rdt("track", redditMap[event.event] || "Custom", {
      value: event.value ? (event.value / 100).toFixed(2) : undefined,
      currency: "USD",
      itemCount: event.quantity,
    });
  }
}

// Pathname-watching subcomponent. Pulled out of TrackingProvider so
// usePathname's static-render bailout suspends only THIS sub-tree (which
// has zero rendered output) instead of suspending the whole page tree
// that the provider wraps. Without this split, every PDP, /shop, etc.
// fell into BAILOUT_TO_CLIENT_SIDE_RENDERING and content like CoaCard
// never appeared in the SSR'd HTML.
function PathnameWatcher({
  isReady,
  status,
}: {
  isReady: boolean;
  status: string;
}) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Track page views on route changes
  useEffect(() => {
    if (!isReady || status !== "granted") return;
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      fireClientPixels({ event: "PageView", eventId });

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "PageView", eventId, url: window.location.href }),
      }).catch(() => {});
    }
  }, [pathname, isReady, status]);

  return null;
}

export function TrackingProvider({ children }: { children: ReactNode }) {
  const { status, isReady } = useConsent();
  const pixelsLoaded = useRef(false);

  // Load pixels when consent is granted
  useEffect(() => {
    if (isReady && status === "granted" && !pixelsLoaded.current) {
      loadPixels();
      pixelsLoaded.current = true;
    }
  }, [isReady, status]);

  // First-touch acquisition capture. Independent of marketing consent —
  // first-party reporting (which channel introduced this customer to us)
  // is operational analytics, not third-party tracking, and is allowed
  // under our privacy policy without granular consent. Stored in
  // localStorage with a 90d TTL; replayed at checkout submission.
  // Idempotent — safe to call on every mount; only writes when there's
  // a new tagged-click signal.
  useEffect(() => {
    initAcquisitionTracker();
  }, []);

  // Initial page view (does not depend on pathname; safe in the parent)
  useEffect(() => {
    if (!isReady || status !== "granted") return;
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const timer = setTimeout(() => {
      fireClientPixels({ event: "PageView", eventId });
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "PageView", eventId, url: window.location.href }),
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, status]);

  const track = useCallback(
    (event: TrackingEvent) => {
      if (status !== "granted") return;

      const eventId = event.eventId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const fullEvent = { ...event, eventId };

      fireClientPixels(fullEvent);

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fullEvent,
          url: window.location.href,
        }),
      }).catch(() => {});
    },
    [status]
  );

  return (
    <TrackingContext.Provider value={{ track }}>
      {/* Hook usage in its own Suspense — bails out independently
          without dragging children with it. */}
      <Suspense fallback={null}>
        <PathnameWatcher isReady={isReady} status={status} />
      </Suspense>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  return useContext(TrackingContext);
}
