import type { Metadata } from "next";
import { DM_Serif_Display, Outfit, DM_Mono } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { CartProvider } from "@/components/CartProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ConsentProvider } from "@/components/ConsentProvider";
import { TrackingProvider } from "@/components/TrackingProvider";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { LocaleProvider } from "@/components/LocaleProvider";
import GoogleTagManager, { GoogleTagManagerNoScript } from "@/components/GoogleTagManager";
import MetaPixel, { MetaPixelNoScript } from "@/components/MetaPixel";
import PostHogProvider from "@/components/PostHogProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Based Research | Research-Grade Peptides, Verified",
  description:
    "A2LA-accredited HPLC-tested research peptides. Public batch-linked certificates of analysis. Free US shipping over $200.",
  metadataBase: new URL("https://basedresearch.com"),
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon-180.png",
  },
  openGraph: {
    title: "Based Research | Research-Grade Peptides, Verified",
    description:
      "A2LA-accredited HPLC-tested research peptides. Public batch-linked certificates of analysis. Free US shipping over $200.",
    type: "website",
    siteName: "Based Research",
    // Images are generated dynamically by src/app/opengraph-image.tsx
    // (and per-product by src/app/product/[slug]/opengraph-image.tsx).
    // Next.js auto-injects the correct <meta og:image> tags via its
    // file-based metadata convention — no manual image URL needed here.
  },
  twitter: {
    card: "summary_large_image",
    title: "Based Research | Research-Grade Peptides, Verified",
    description:
      "A2LA-accredited HPLC-tested research peptides. Public batch-linked certificates of analysis.",
    // twitter.images also auto-filled from the opengraph-image.tsx files.
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Based Research",
  legalName: "Based Research LLC",
  url: "https://basedresearch.com",
  description:
    "Supplier of analytical-grade biochemical reference standards for in-vitro laboratory research. Research use only. Not for human or animal consumption. A2LA-accredited HPLC verified with public certificates of analysis.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "US",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@basedresearch.com",
    contactType: "customer service",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${dmSerif.variable} ${outfit.variable} ${dmMono.variable} h-full antialiased`}
    >
      <head>
        <GoogleTagManager />
        <MetaPixel />
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta
            name="google-site-verification"
            content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <GoogleTagManagerNoScript />
        <MetaPixelNoScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <ConsentProvider>
          {/* TrackingProvider + PostHogProvider both contain navigation
              hooks (usePathname / useSearchParams). Each provider wraps
              its own hook-using subcomponent in a tightly-scoped Suspense
              internally, so the providers themselves no longer suspend
              their children. ReferralCapture still calls useSearchParams
              directly — wrapped here in its own Suspense so the same
              bailout doesn't take the rest of the tree down with it. */}
          <TrackingProvider>
            <AuthProvider>
              <PostHogProvider>
                <LocaleProvider>
                  <CurrencyProvider>
                    <CartProvider>
                      {/* SiteChrome conditionally renders header / footer /
                          floating widgets based on pathname. Hidden on
                          /admin and /admin-access so the dashboard fills
                          the viewport without storefront chrome. */}
                      <SiteChrome>{children}</SiteChrome>
                    </CartProvider>
                  </CurrencyProvider>
                </LocaleProvider>
              </PostHogProvider>
            </AuthProvider>
          </TrackingProvider>
        </ConsentProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
