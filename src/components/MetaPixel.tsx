import Script from "next/script";

/**
 * Meta (Facebook) Pixel — client-side half.
 *
 * Activates only when NEXT_PUBLIC_META_PIXEL_ID is set. Fires PageView on
 * every route. Product / cart / checkout / purchase events are fired
 * imperatively from the relevant components via `window.fbq('track', …)`
 * (helpers in `src/lib/meta-pixel.ts`).
 *
 * Server-side match-quality lives in `src/lib/meta-capi.ts` — the server
 * sends the same events via Conversions API with the same `eventID` so
 * Meta dedupes client + server hits and attributes on whichever arrives
 * (ad-blocker-resistant).
 */
export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', ${JSON.stringify(pixelId)});
            fbq('track', 'PageView');
          `,
        }}
      />
    </>
  );
}

/** <noscript> fallback so users with JS disabled still fire a PageView. */
export function MetaPixelNoScript() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;
  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
