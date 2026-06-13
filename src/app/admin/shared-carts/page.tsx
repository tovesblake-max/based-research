import type { Metadata } from "next";
import SharedCartsBuilder from "./SharedCartsBuilder";

export const metadata: Metadata = {
  title: "Shared Carts | Based Research Admin",
  robots: { index: false, follow: false },
};

export default function SharedCartsPage() {
  return <SharedCartsBuilder />;
}
