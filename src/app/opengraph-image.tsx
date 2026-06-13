import { ImageResponse } from "next/og";

// Homepage / site-default social preview image.
//
// Next.js auto-picks up this file as the OG image for every page that
// doesn't declare its own via the file-based metadata convention
// (src/app/.../opengraph-image.tsx). No manual meta tags needed.
//
// Rendered at 1200×630 — standard OG aspect ratio (1.91:1). Meta,
// Twitter/X, LinkedIn, iMessage all preview at this size correctly.

export const alt = "Based Research — Research-Grade Peptides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(family: string, weight = 400): Promise<ArrayBuffer> {
  const familyParam = family.replace(/ /g, "+");
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}&display=swap`;
  const cssRes = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0" }, // required to get TTF/WOFF2 URL back
  });
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)\s*format\('(truetype|woff2?)'\)/);
  if (!match) throw new Error(`font url not found for ${family}`);
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

export default async function Image() {
  const [serif, sans] = await Promise.all([
    loadFont("DM Serif Display", 400),
    loadFont("Outfit", 600),
  ]);

  // Colours taken from the site's tailwind theme — primary navy for the
  // gradient base, accent cream for the foreground lockup. Keeps social
  // previews visually consistent with the real site.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #1E3A5F 0%, #1E3A5F 55%, #2C4E78 100%)",
          color: "#FFFFFF",
          fontFamily: "Outfit",
        }}
      >
        {/* Top row — brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Inline SVG mark — rendered cleanly at any scale, no font/image fetch */}
          <svg width="54" height="54" viewBox="0 0 100 100" fill="none">
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
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "#FFFFFF",
            }}
          >
            Based Research
          </div>
        </div>

        {/* Middle — headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.05,
              fontFamily: "DM Serif Display",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            Research-Grade Peptides
          </div>
          <div
            style={{
              fontSize: 30,
              color: "rgba(255,255,255,0.75)",
              maxWidth: 800,
              letterSpacing: "0.005em",
            }}
          >
            A2LA-accredited HPLC verified on every batch. Public certificates of analysis.
          </div>
        </div>

        {/* Bottom — trust badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <Badge label="99%+ Purity" />
          <Badge label="Public COAs" />
          <Badge label="Free US Shipping $200+" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Serif Display", data: serif, weight: 400 },
        { name: "Outfit", data: sans, weight: 600 },
      ],
    },
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 22,
        fontWeight: 600,
        color: "rgba(255,255,255,0.92)",
        letterSpacing: "0.01em",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: "#8CB4E8",
        }}
      />
      {label}
    </div>
  );
}
