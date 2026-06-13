import type { Metadata } from "next";
import { Suspense } from "react";
import ShopContent from "@/components/ShopContent";

export const metadata: Metadata = {
  title: "Research Materials Catalog | Based Research",
  description:
    "Catalog of A2LA-accredited HPLC-verified research reference materials for in-vitro and non-clinical laboratory use. Public batch-linked certificates of analysis.",
  openGraph: {
    title: "Shop Research Peptides | Based Research",
    description:
      "Browse our catalog of A2LA-accredited HPLC-verified research peptides. Public COAs, free US shipping over $200.",
    type: "website",
  },
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-accent rounded w-48" />
            <div className="h-6 bg-accent rounded w-72" />
          </div>
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
