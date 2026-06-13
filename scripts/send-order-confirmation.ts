/**
 * Re-send (or first-send) an order confirmation email for a given
 * order ID. Used to recover from auto-flow misses.
 *
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/send-order-confirmation.ts <orderId>
 */

import { sendOrderConfirmationEmail } from "../src/lib/email";

(async () => {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error("usage: tsx scripts/send-order-confirmation.ts <orderId>");
    process.exit(1);
  }

  const { sql } = await import("@vercel/postgres");

  const orderRows = (await sql`
    SELECT o.order_number, o.email, o.subtotal, o.shipping_cost, o.discount,
           o.card_surcharge, o.total, o.payment_gateway, o.shipping_address,
           u.first_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = ${orderId}
  `).rows;
  const order = orderRows[0];
  if (!order) {
    console.error(`order ${orderId} not found`);
    process.exit(1);
  }

  const items = (await sql`
    SELECT product_name, variant_size, quantity, unit_price, line_total
      FROM order_items
     WHERE order_id = ${orderId}
     ORDER BY product_name
  `).rows;

  const ship = order.shipping_address as Record<string, string>;

  await sendOrderConfirmationEmail({
    email: order.email as string,
    orderNumber: order.order_number as string,
    firstName: (order.first_name as string | null) || ship.firstName || null,
    items: items.map((i) => ({
      productName: String(i.product_name),
      variantSize: String(i.variant_size),
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.line_total),
    })),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shipping_cost),
    discount: Number(order.discount),
    cardSurcharge: Number(order.card_surcharge),
    total: Number(order.total),
    paymentMethod: order.payment_gateway === "ach" ? "ach" : "card",
    shippingAddress: {
      firstName: ship.firstName,
      lastName: ship.lastName,
      address1: ship.address1,
      address2: ship.address2,
      city: ship.city,
      state: ship.state,
      zip: ship.zip,
    },
  });

  console.log(`Sent order confirmation to ${order.email} for ${order.order_number}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
