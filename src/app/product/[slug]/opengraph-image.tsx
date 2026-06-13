import { ImageResponse } from "next/og";
import { getProductBySlug, getStartingPrice } from "@/lib/products";
import { getCategoryById } from "@/lib/categories";

// Per-product OG image. Shares the same visual treatment as the site
// default but renders the specific product's name, category, and starting
// price — so a pasted link in a DM or ad preview reads as:
//
//   [ Based Research logo ]
//   GHK-Cu
//   Longevity & regeneration
//   From $60 · A2LA HPLC verified
//
// instead of the generic brand card.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Note: no `runtime = "edge"` here — the parent product route uses
// generateStaticParams for catalog pre-rendering, and edge runtime
// is incompatible with that. Node runtime renders the OG image just
// as well; Vercel caches the output so cold-path cost is negligible.

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return [
    {
      id: "main",
      alt: product
        ? `${product.name} — Based Research`
        : "Based Research",
      size,
      contentType,
    },
  ];
}

async function loadFont(family: string, weight = 400): Promise<ArrayBuffer> {
  const familyParam = family.replace(/ /g, "+");
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`;
  const cssRes = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(truetype|woff2?)'\)/);
  if (!match) throw new Error(`font url not found for ${family}`);
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function ProductImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  const category = product ? getCategoryById(product.category) : null;
  const startingPrice = product ? getStartingPrice(product) : 0;

  const [serif, sans, sansBold] = await Promise.all([
    loadFont("DM Serif Display", 400),
    loadFont("Outfit", 500),
    loadFont("Outfit", 700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background:
            "linear-gradient(135deg, #1E3A5F 0%, #1E3A5F 55%, #2C4E78 100%)",
          color: "#FFFFFF",
          fontFamily: "Outfit",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
            <path
              d="M50 8 C 30 32, 18 52, 18 66 A 32 32 0 0 0 82 66 C 82 52, 70 32, 50 8 Z"
              fill="rgba(255,255,255,0.08)"
              stroke="#8CB4E8"
              strokeWidth="2.5"
            />
            <circle cx="38" cy="50" r="5" fill="#FFFFFF" />
            <circle cx="58" cy="42" r="5" fill="#FFFFFF" />
            <circle cx="50" cy="66" r="5" fill="#FFFFFF" />
            <circle cx="38" cy="76" r="5" fill="#FFFFFF" />
            <path d="M38 50 L58 42 M58 42 L50 66 M50 66 L38 76" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.8)",
              textTransform: "uppercase",
            }}
          >
            Based Research
          </div>
        </div>

        {/* Product headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {category && (
            <div
              style={{
                fontSize: 22,
                color: "#8CB4E8",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {category.name}
            </div>
          )}
          <div
            style={{
              fontSize: product && product.name.length > 22 ? 72 : 96,
              lineHeight: 1.02,
              fontFamily: "DM Serif Display",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              maxWidth: 1040,
            }}
          >
            {product?.name || "Based Research"}
          </div>
          {product && (
            <div
              style={{
                fontSize: 26,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.4,
                maxWidth: 960,
              }}
            >
              {product.description}
            </div>
          )}
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {product && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: 20,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  From
                </span>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    fontFamily: "Outfit",
                  }}
                >
                  {formatUSD(startingPrice)}
                </span>
              </div>
            )}
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#8CB4E8",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              A2LA HPLC verified
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 500,
            }}
          >
            basedresearch.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Serif Display", data: serif, weight: 400 },
        { name: "Outfit", data: sans, weight: 500 },
        { name: "Outfit", data: sansBold, weight: 700 },
      ],
    },
  );
}
