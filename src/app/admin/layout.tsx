import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Server-side admin gate. Runs before any /admin/* page renders, so a
 * non-admin (logged out OR a regular customer) never even sees the
 * dashboard shell. The data APIs already enforce requireAdmin(), but the
 * admin UI itself must not render for non-admins — previously this layout
 * was a passthrough and the middleware had no role check, so any
 * phone-verified customer could load the admin chrome.
 *
 * force-dynamic so this auth check runs on every request (never cached /
 * statically rendered).
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Fail closed: any error resolving the session (e.g. malformed token,
  // transient DB issue) is treated as "not an admin" and redirected,
  // never a 500 that leaks the page. redirect() throws NEXT_REDIRECT, so
  // it stays OUTSIDE the try/catch.
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (!user || user.role !== "admin") {
    redirect("/auth/sign-in?redirect=/admin");
  }
  return <>{children}</>;
}
