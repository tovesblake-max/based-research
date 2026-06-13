"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/Button";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

/**
 * Order status / confirmation page.
 *
 * Reads ?order_number=… and asks /api/checkout/result for the order's
 * current state. Because this template ships without a payment processor,
 * orders land in a "pending" (unpaid) state and this page surfaces that.
 * Once you wire a processor whose webhook flips orders to "completed",
 * this page shows the confirmed state automatically.
 */

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

interface ResultItem {
  productName: string;
  variantSize: string;
  quantity: number;
  price: number;
}
interface OrderSummary {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  email: string;
}
interface ResultPayload {
  status: "completed" | "pending" | "failed";
  msg?: string;
  order?: OrderSummary;
  items?: ResultItem[];
}

export default function CallbackClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number");
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/checkout/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber }),
        });
        const data = await res.json();
        if (!cancelled) setResult(res.ok ? data : { status: "failed", msg: data.error });
      } catch {
        if (!cancelled) setResult({ status: "failed", msg: "Could not load this order." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  if (!orderNumber) {
    return (
      <Shell>
        <XCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-semibold">No order found</h1>
        <p className="mb-6 text-muted-foreground">We couldn&apos;t find an order reference.</p>
        <Link href="/shop"><Button>Back to shop</Button></Link>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your order…</p>
      </Shell>
    );
  }

  if (result?.status === "failed") {
    return (
      <Shell>
        <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
        <p className="mb-6 text-muted-foreground">{result.msg || "Your order could not be completed."}</p>
        <Link href="/cart"><Button>Return to cart</Button></Link>
      </Shell>
    );
  }

  const completed = result?.status === "completed";

  return (
    <Shell>
      {completed ? (
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
      ) : (
        <Clock className="mx-auto mb-4 h-10 w-10 text-amber-500" />
      )}
      <h1 className="mb-2 text-2xl font-semibold">
        {completed ? "Order confirmed" : "Order received"}
      </h1>
      <p className="mb-1 text-muted-foreground">
        Reference <span className="font-medium text-foreground">{orderNumber}</span>
      </p>
      {!completed && (
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          {result?.msg ||
            "This order has been recorded but not yet paid — no payment processor is configured in this template."}
        </p>
      )}

      {result?.order && result.items && (
        <div className="mx-auto mt-6 max-w-md rounded-xl border border-border-strong bg-card p-5 text-left">
          <ul className="mb-4 space-y-2">
            {result.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {i.productName} <span className="text-xs">· {i.variantSize} × {i.quantity}</span>
                </span>
                <span className="tabular-nums">{money(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1.5 border-t border-border pt-4 text-sm">
            <Row label="Subtotal" value={money(result.order.subtotal)} />
            <Row label="Shipping" value={result.order.shipping === 0 ? "Free" : money(result.order.shipping)} />
            {result.order.discount > 0 && <Row label="Discount" value={`−${money(result.order.discount)}`} />}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(result.order.total)}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-8">
        <Link href="/shop"><Button variant="outline">Continue shopping</Button></Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-20 text-center">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
