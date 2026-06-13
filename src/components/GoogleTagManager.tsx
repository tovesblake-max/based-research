import Script from "next/script";

/**
 * Google Tag Manager container.
 *
 * Activates only when NEXT_PUBLIC_GTM_ID is set (format: "GTM-XXXXXXX").
 *
 * Once active, it loads the GTM container script and all tags configured
 * inside GTM fire from there — GA4, Google Ads conversions, Meta Pixel
 * (duplicates what we send server-side), etc.
 *
 * Events are pushed to `window.dataLayer` from our TrackingProvider and
 * other call-sites; GTM triggers match on these event names.
 *
 * Standard e-commerce event names this site fires:
 *   - page_view        (auto via GTM)
 *   - view_item        (product page)
 *   - add_to_cart      (cart mutations)
 *   - begin_checkout   (start of checkout)
 *   - purchase         (checkout callback)
 *
 * Enhanced Conversions user_data is included with the purchase event
 * (hashed email + phone) to improve Google Ads attribution.
 */
export default function GoogleTagManager() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  // By default, load GTM from our first-party edge proxy at /_t/gtm.js.
  // This evades ad blockers (which block googletagmanager.com) and keeps
  // cookies first-party for better attribution. Can be overridden to an
  // external subdomain (e.g. Cloudflare Zaraz) via NEXT_PUBLIC_GTM_SERVER_URL,
  // or explicitly set to "direct" to load from Google's CDN.
  const serverUrl = process.env.NEXT_PUBLIC_GTM_SERVER_URL;

  if (!gtmId) return null;

  // gtm.js src
  const src =
    serverUrl === "direct"
      ? `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
      : serverUrl
        ? `${serverUrl.replace(/\/$/, "")}/gtm.js?id=${gtmId}`
        : `/_t/gtm.js?id=${gtmId}`;

  return (
    <>
      {/* dataLayer initializer + GTM loader */}
      <Script
        id="gtm-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
            (function(w,d,s,l,i){
              var f = d.getElementsByTagName(s)[0],
                  j = d.createElement(s),
                  dl = l != 'dataLayer' ? '&l=' + l : '';
              j.async = true;
              j.src = ${JSON.stringify(src)} + dl;
              f.parentNode.insertBefore(j, f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
    </>
  );
}

/**
 * GTM <noscript> fallback for users with JS disabled.
 * Must be placed inside <body> at the very top per Google's install spec.
 */
export function GoogleTagManagerNoScript() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const serverUrl = process.env.NEXT_PUBLIC_GTM_SERVER_URL;
  if (!gtmId) return null;

  const src =
    serverUrl === "direct"
      ? `https://www.googletagmanager.com/ns.html?id=${gtmId}`
      : serverUrl
        ? `${serverUrl.replace(/\/$/, "")}/ns.html?id=${gtmId}`
        : `/_t/ns.html?id=${gtmId}`;

  return (
    <noscript>
      <iframe
        src={src}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm-noscript"
      />
    </noscript>
  );
}
