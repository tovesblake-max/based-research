"""
Regenerate every catalog-derived doc artifact from products.ts in one
pass. Produces:
  - docs/product-margins.pdf      (margin report, sorted by margin %)
  - docs/margin-analysis.csv      (same data, machine-readable)
  - docs/price-list.csv           (every variant with price + cost)
  - docs/product-links.csv        (one row per product with URL + price range)

Re-run any time products.ts changes; never edit these artifacts by hand.
"""
import re
import csv
import datetime
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

ROOT = Path("~/Documents/based-research")
SRC = ROOT / "src/lib/products.ts"
DOCS = ROOT / "docs"

text = SRC.read_text()

# Each product opens with `id: "..."` then `name: "..."` then `slug: "..."`.
# We slice between consecutive opens so each block is self-contained when we
# scan for variants, category, noShipping, and upsellOnly.
product_pat = re.compile(
    r'\{\s*id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*slug:\s*"([^"]+)"'
)
category_pat = re.compile(r'category:\s*"([^"]+)"')
variant_pat = re.compile(
    r'\{\s*size:\s*"([^"]+)"\s*,\s*price:\s*(\d+)\s*,\s*sku:\s*"([^"]+)"'
    r'(?:\s*,\s*costCents:\s*(\d+))?\s*\}'
)
upsell_pat = re.compile(r"upsellOnly:\s*true")
noship_pat = re.compile(r"noShipping:\s*true")

opens = list(product_pat.finditer(text))
opens_with_end = [(m.start(), m.group(1), m.group(2), m.group(3)) for m in opens]
opens_with_end.append((len(text), None, None, None))

products = []  # list of dicts
for i in range(len(opens_with_end) - 1):
    start, pid, name, slug = opens_with_end[i]
    end = opens_with_end[i + 1][0]
    block = text[start:end]
    cat_m = category_pat.search(block)
    category = cat_m.group(1) if cat_m else ""
    hidden = bool(upsell_pat.search(block))
    no_shipping = bool(noship_pat.search(block))
    variants = []
    for vm in variant_pat.finditer(block):
        size, price_cents, sku, cost_cents = vm.groups()
        variants.append({
            "size": size,
            "price_usd": int(price_cents) / 100,
            "sku": sku,
            "cost_usd": (int(cost_cents) / 100) if cost_cents else None,
        })
    products.append({
        "id": pid,
        "name": name,
        "slug": slug,
        "category": category,
        "hidden": hidden,
        "no_shipping": no_shipping,
        "variants": variants,
    })

# ── Flatten to per-variant rows for the margin-analysis + PDF ──────
rows = []
for p in products:
    for v in p["variants"]:
        retail = v["price_usd"]
        cost = v["cost_usd"]
        if cost is not None:
            profit = retail - cost
            margin_pct = (profit / retail) * 100 if retail > 0 else 0
        else:
            profit = None
            margin_pct = None
        rows.append({
            "slug": p["slug"],
            "name": p["name"],
            "size": v["size"],
            "sku": v["sku"],
            "category": p["category"],
            "retail": retail,
            "cost": cost,
            "profit": profit,
            "margin_pct": margin_pct,
            "hidden": p["hidden"],
            "no_shipping": p["no_shipping"],
        })

# Sort: margin desc; rows without margin sink to bottom.
rows.sort(key=lambda r: (-(r["margin_pct"] if r["margin_pct"] is not None else -1)))

# ── 1) Margin PDF ──────────────────────────────────────────────────
OUT_PDF = DOCS / "product-margins.pdf"
doc = SimpleDocTemplate(
    str(OUT_PDF), pagesize=letter,
    leftMargin=0.4 * inch, rightMargin=0.4 * inch,
    topMargin=0.5 * inch, bottomMargin=0.5 * inch,
)
styles = getSampleStyleSheet()
small = ParagraphStyle("small", parent=styles["Normal"], fontSize=9, leading=11)
cell_style = ParagraphStyle("cell", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=10)
header_style = ParagraphStyle(
    "header", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9,
    leading=11, textColor=colors.whitesmoke,
)

story = []
story.append(Paragraph("<b>Based Research &mdash; Product Margins</b>", styles["Title"]))
story.append(Paragraph(
    f"Round-number reprice ({datetime.date.today().isoformat()}). Sorted by profit % "
    f"descending. Hidden (upsell-only) SKUs are tagged.",
    small,
))
story.append(Spacer(1, 0.18 * inch))

header = [Paragraph(h, header_style) for h in
          ["Product", "Size", "SKU", "Wholesale", "Retail", "Profit $", "Profit %"]]
table_data = [header]
for r in rows:
    name = r["name"] + (" (hidden)" if r["hidden"] else "")
    cost_str = f"${r['cost']:.2f}" if r["cost"] is not None else "—"
    profit_str = f"${r['profit']:.2f}" if r["profit"] is not None else "—"
    margin_str = f"{r['margin_pct']:.0f}%" if r["margin_pct"] is not None else "—"
    table_data.append([
        Paragraph(name, cell_style),
        Paragraph(r["size"], cell_style),
        r["sku"], cost_str, f"${r['retail']:.2f}", profit_str, margin_str,
    ])

table = Table(
    table_data, repeatRows=1,
    colWidths=[2.05 * inch, 1.85 * inch, 0.9 * inch, 0.85 * inch, 0.75 * inch, 0.75 * inch, 0.7 * inch],
)
ts = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 9),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 1), (-1, -1), 8.5),
    ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
    ("ALIGN", (0, 0), (2, -1), "LEFT"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ("TOPPADDING", (0, 0), (-1, 0), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
])
for i in range(1, len(table_data)):
    if i % 2 == 0:
        ts.add("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f9fafb"))
table.setStyle(ts)
story.append(table)

public_with_cost = [r for r in rows if not r["hidden"] and r["cost"] is not None]
total_retail = sum(r["retail"] for r in public_with_cost)
total_cost = sum(r["cost"] for r in public_with_cost)
total_profit = total_retail - total_cost
blended = (total_profit / total_retail) * 100 if total_retail else 0

story.append(Spacer(1, 0.22 * inch))
story.append(Paragraph(
    f"<b>Public catalog blend (one of each variant):</b> "
    f"retail ${total_retail:,.2f} &middot; wholesale ${total_cost:,.2f} &middot; "
    f"profit ${total_profit:,.2f} &middot; blended margin <b>{blended:.1f}%</b>",
    small,
))
doc.build(story)
print(f"  wrote {OUT_PDF.relative_to(ROOT)}  ({len(rows)} rows)")

# ── 2) margin-analysis.csv (all variants, margin-sorted) ───────────
OUT_MA = DOCS / "margin-analysis.csv"
with OUT_MA.open("w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["slug", "name", "size", "sku", "retail_usd", "cogs_usd", "gp_usd", "gp_pct", "flag"])
    for r in rows:
        flag = "UPSELL_ONLY" if r["hidden"] else (
            "NO_COST" if r["cost"] is None else "-"
        )
        w.writerow([
            r["slug"], r["name"], r["size"], r["sku"],
            f"{r['retail']:.2f}",
            f"{r['cost']:.2f}" if r["cost"] is not None else "",
            f"{r['profit']:.2f}" if r["profit"] is not None else "",
            f"{r['margin_pct']:.1f}" if r["margin_pct"] is not None else "",
            flag,
        ])
print(f"  wrote {OUT_MA.relative_to(ROOT)}")

# ── 3) price-list.csv (per-variant, in catalog order) ──────────────
OUT_PL = DOCS / "price-list.csv"
with OUT_PL.open("w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow([
        "slug", "name", "category", "size", "sku",
        "price_usd", "cost_usd", "margin_usd", "margin_pct",
        "visibility", "no_shipping",
    ])
    for p in products:
        for v in p["variants"]:
            retail = v["price_usd"]
            cost = v["cost_usd"]
            margin = retail - cost if cost is not None else None
            margin_pct = ((margin / retail) * 100) if (cost is not None and retail > 0) else None
            w.writerow([
                p["slug"], p["name"], p["category"], v["size"], v["sku"],
                f"{retail:.2f}",
                f"{cost:.2f}" if cost is not None else "",
                f"{margin:.2f}" if margin is not None else "",
                f"{margin_pct:.0f}" if margin_pct is not None else "",
                "hidden" if p["hidden"] else "public",
                str(p["no_shipping"]).lower(),
            ])
print(f"  wrote {OUT_PL.relative_to(ROOT)}")

# ── 4) product-links.csv (one row per product, with URL + range) ───
OUT_LINKS = DOCS / "product-links.csv"
with OUT_LINKS.open("w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["name", "slug", "category", "visibility", "price_range", "url"])
    # Sort alphabetically by name to match the prior file's ordering
    for p in sorted(products, key=lambda x: x["name"].lower()):
        if not p["variants"]:
            continue
        prices = sorted(v["price_usd"] for v in p["variants"])
        if len(prices) == 1 or prices[0] == prices[-1]:
            price_range = f"${prices[0]:.2f}"
        else:
            price_range = f"${prices[0]:.2f} - ${prices[-1]:.2f}"
        w.writerow([
            p["name"],
            p["slug"],
            p["category"],
            "hidden" if p["hidden"] else "public",
            price_range,
            f"https://basedresearch.com/product/{p['slug']}",
        ])
print(f"  wrote {OUT_LINKS.relative_to(ROOT)}")
print("\nAll catalog artifacts regenerated from products.ts.")
