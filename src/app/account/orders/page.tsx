"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { Package, ArrowRight, Loader2, Truck, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  variantSize: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  slug: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  trackingCarrier?: string | null;
  trackingMilestone?: string | null;
  trackingLastEvent?: string | null;
  deliveredAt?: string | null;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  createdAt: string;
  items: OrderItem[];
}

const milestoneLabel: Record<string, string> = {
  pending: "Label created",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  exception: "Delivery issue",
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pending", icon: <Clock className="w-4 h-4" />, color: "text-amber-600 bg-amber-50" },
  confirmed: { label: "Confirmed", icon: <CheckCircle className="w-4 h-4" />, color: "text-blue-600 bg-blue-50" },
  processing: { label: "Processing", icon: <Package className="w-4 h-4" />, color: "text-indigo-600 bg-indigo-50" },
  shipped: { label: "Shipped", icon: <Truck className="w-4 h-4" />, color: "text-purple-600 bg-purple-50" },
  delivered: { label: "Delivered", icon: <CheckCircle className="w-4 h-4" />, color: "text-success bg-success/10" },
  cancelled: { label: "Cancelled", icon: <XCircle className="w-4 h-4" />, color: "text-muted bg-accent" },
  refunded: { label: "Refunded", icon: <XCircle className="w-4 h-4" />, color: "text-muted bg-accent" },
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (res.ok) {
          setOrders(data.orders);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">Orders</h1>
      <p className="text-muted text-sm mb-8">
        View your previous orders and track shipments.
      </p>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedOrder === order.id;

            return (
              <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Order header */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full p-5 flex items-center justify-between text-left cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-muted mt-0.5">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-foreground">{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="min-w-0">
                            <Link
                              href={`/product/${item.slug}`}
                              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                            >
                              {item.productName}
                            </Link>
                            <p className="text-xs text-muted">
                              {item.variantSize} &times; {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm text-foreground flex-shrink-0 ml-4">
                            {formatPrice(item.lineTotal)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Shipping</span>
                        <span>{order.shippingCost === 0 ? "Free" : formatPrice(order.shippingCost)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-success">
                          <span>Discount</span>
                          <span>-{formatPrice(order.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-foreground pt-1.5 border-t border-border">
                        <span>Total</span>
                        <span>{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Tracking — expanded with carrier, milestone, and
                        delivered timestamp so customers don't have to click
                        through to the carrier site to know where their
                        package is. */}
                    {order.trackingNumber && (
                      <div className="rounded-lg bg-accent p-3 text-sm space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-muted">Tracking:</span>
                          {order.trackingUrl ? (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                            >
                              {order.trackingNumber}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="font-medium text-foreground">{order.trackingNumber}</span>
                          )}
                          {order.trackingCarrier && (
                            <span className="text-xs text-muted ml-auto uppercase tracking-wider">
                              via {order.trackingCarrier}
                            </span>
                          )}
                        </div>
                        {order.trackingMilestone && (
                          <p className="text-xs text-foreground">
                            <span className="font-medium">
                              {milestoneLabel[order.trackingMilestone] || order.trackingMilestone}
                            </span>
                            {order.trackingLastEvent && (
                              <span className="text-muted"> · {order.trackingLastEvent}</span>
                            )}
                          </p>
                        )}
                        {order.deliveredAt && (
                          <p className="text-xs text-success font-medium">
                            Delivered {new Date(order.deliveredAt).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Ship-to address */}
                    {order.shippingAddress && (
                      <div className="text-sm">
                        <p className="text-xs text-muted uppercase tracking-wider mb-1">Ship to</p>
                        <p className="text-foreground leading-relaxed">
                          {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                          {order.shippingAddress.address1}
                          {order.shippingAddress.address2 && <>, {order.shippingAddress.address2}</>}<br />
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted" />
          </div>
          <h3 className="font-semibold text-foreground text-lg mb-2">No orders yet</h3>
          <p className="text-muted text-sm mb-6">
            You don&apos;t have any orders yet. Browse our catalog to get started.
          </p>
          <Link href="/catalog">
            <Button variant="primary" size="lg">
              Continue shopping <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
