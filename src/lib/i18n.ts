/**
 * Site-wide English / Spanish translation dictionary + helpers.
 *
 * Scope: high-visibility customer-facing surfaces only.
 * Translated:
 *   - Header (nav, banner, contact bar, language + currency toggles)
 *   - Footer
 *   - Catalog, product detail, cart, checkout
 *   - Thank-you page, account dashboard headlines
 *   - Common form labels, buttons, error messages
 *
 * NOT translated (intentional):
 *   - Blog / research articles (per the operator — long-form scientific
 *     content stays in English)
 *   - Admin dashboard (operator-only)
 *   - Product names + SKUs (international peptide nomenclature)
 *   - Legal pages (jurisdiction-specific phrasing)
 *
 * Keys are dotted hierarchical strings, e.g. "nav.shop". Missing
 * Spanish keys fall back to English so a partial dictionary still
 * renders something — never a raw `nav.shop` string in front of the
 * customer.
 */

export type Locale = "en" | "es";

let _displayLocale: Locale = "en";
export function setDisplayLocale(l: Locale): void {
  _displayLocale = l;
}
export function getDisplayLocale(): Locale {
  return _displayLocale;
}

type Dictionary = Record<string, string>;

const en: Dictionary = {
  // ── Promo banner ────────────────────────────────
  // banner.prefix is shown only on >= sm screens; bannerCore is
  // always shown. Splitting them keeps the original mobile-truncation
  // behavior of the storefront banner.
  "banner.prefix": "",
  "banner.core": "FREE US SHIPPING OVER $200 · A2LA-ACCREDITED HPLC VERIFIED",
  "banner.tagline": "FREE US SHIPPING OVER $200 · A2LA-ACCREDITED HPLC VERIFIED",

  // ── Header / nav ────────────────────────────────
  "nav.shop": "Catalog",
  "nav.research": "Research",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.faq": "FAQ",
  "nav.affiliate": "Partner Program",
  "nav.account": "Account",
  "nav.signIn": "Sign in",
  "nav.signUp": "Sign up",
  "nav.cart": "Cart",
  "nav.searchPlaceholder": "Search catalog…",
  "header.hours": "Mon–Fri 9AM–5PM EST",

  // ── Common buttons ──────────────────────────────
  "btn.addToCart": "Add to Cart",
  "btn.added": "Added!",
  "btn.subscribeAndAdd": "Subscribe & Add to Cart",
  "btn.viewDetails": "View details",
  "btn.continueShopping": "Continue Shopping",
  "btn.backToCatalog": "Back to catalog",
  "btn.checkout": "Checkout",
  "btn.placeOrder": "Place order",
  "btn.applyCode": "Apply",
  "btn.removeCode": "Remove",
  "btn.yes": "Yes",
  "btn.no": "No",
  "btn.cancel": "Cancel",
  "btn.confirm": "Confirm",
  "btn.save": "Save",
  "btn.close": "Close",

  // ── Cart ────────────────────────────────────────
  "cart.title": "Your cart",
  "cart.empty.title": "Your cart is empty",
  "cart.empty.body": "Browse the catalog and add research materials to get started.",
  "cart.subtotal": "Subtotal",
  "cart.shipping": "Shipping",
  "cart.shippingFree": "Free",
  "cart.discount": "Discount",
  "cart.total": "Total",
  "cart.couponPlaceholder": "Promo code",
  "cart.qty": "Qty",
  "cart.remove": "Remove",
  "cart.freeShippingProgress": "Add {{amount}} more for free US shipping",
  "cart.freeShippingUnlocked": "Free US shipping unlocked",

  // ── Product detail ──────────────────────────────
  "pdp.purity": "Purity",
  "pdp.casNumber": "CAS Number",
  "pdp.molarMass": "Molar Mass",
  "pdp.size": "Size",
  "pdp.freeShippingNote": "Free US shipping on orders over $200, with tracking provided.",
  "pdp.thirdPartyTested": "Third-party tested",
  "pdp.researchUseOnly": "For laboratory research use only. Not for human or veterinary use. Not for diagnostic or therapeutic use.",
  "pdp.relatedProducts": "Related Products",
  "pdp.frequentlyBoughtTogether": "Frequently Bought Together",
  "pdp.bundleTotal": "Bundle total",
  "pdp.addAllToCart": "Add All to Cart",
  "pdp.viewBlend": "Looking for the {{name}}?",

  // ── Checkout ────────────────────────────────────
  "checkout.title": "Checkout",
  "checkout.shippingAddress": "Shipping address",
  "checkout.firstName": "First name",
  "checkout.lastName": "Last name",
  "checkout.email": "Email",
  "checkout.phone": "Phone",
  "checkout.address1": "Street address",
  "checkout.address2": "Apt, suite, etc. (optional)",
  "checkout.city": "City",
  "checkout.state": "State",
  "checkout.zip": "ZIP code",
  "checkout.country": "Country",
  "checkout.paymentMethod": "Payment method",
  "checkout.card": "Credit / debit card",
  "checkout.ach": "ACH bank transfer",
  "checkout.achSavings": "Save 5% with ACH",
  "checkout.cardSurcharge": "Card processing fee",
  "checkout.orderSummary": "Order summary",
  "checkout.statementDescriptor":
    "On your statement this charge may appear as INV or another descriptor from our processor, not Based Research.",

  // ── Thank-you page ──────────────────────────────
  "thanks.title": "Order Confirmed",
  "thanks.subtitle": "Thank you. We have you covered from here.",
  "thanks.orderNumber": "Order number",
  "thanks.summary.title": "What you ordered",
  "thanks.next.title": "What happens next",
  "thanks.reading.title": "While you wait, some reading",
  "thanks.reading.subtitle":
    "Research summaries from our blog covering the mechanisms relevant to what you just ordered. Optional. Bookmark for later if you prefer.",
  "thanks.viewOrders": "View Orders",

  // ── Account ─────────────────────────────────────
  "account.title": "Account",
  "account.orders": "Orders",
  "account.subscriptions": "Subscriptions",
  "account.addresses": "Addresses",
  "account.signOut": "Sign out",

  // ── Footer ──────────────────────────────────────
  "footer.tagline": "Research-grade reference materials. A2LA-accredited HPLC verified.",
  "footer.shop": "Catalog",
  "footer.company": "Company",
  "footer.support": "Support",
  "footer.legal": "Legal",
  "footer.acceptedPayments": "Accepted payment methods",
  "footer.researchUseOnly": "For Research Use Only. Not for human or animal consumption.",

  // ── Currency / locale toggles ───────────────────
  "toggle.language": "Language",
  "toggle.currency": "Currency",
  "toggle.settlesUsd": "settles in USD",

  // ── Forms / validation ──────────────────────────
  "form.required": "Required",
  "form.invalidEmail": "Enter a valid email address",
  "form.invalidPhone": "Enter a valid phone number",
  "form.loading": "Loading…",
  "form.error": "Something went wrong",

  // ── Common labels ──────────────────────────────
  "common.from": "From",
  "common.startingAt": "Starting at",
  "common.eachShort": "each",
  "common.save": "Save",
  "common.off": "off",
  "common.in": "in",
  "common.outOfStock": "Out of stock",
};

const es: Dictionary = {
  "banner.tagline": "ENVÍO GRATIS EN PEDIDOS MAYORES DE $200 USD · VERIFICADO POR HPLC ACREDITADO POR A2LA",

  "nav.shop": "Tienda",
  "nav.research": "Investigación",
  "nav.about": "Nosotros",
  "nav.contact": "Contacto",
  "nav.faq": "Preguntas frecuentes",
  "nav.affiliate": "Programa de socios",
  "nav.account": "Cuenta",
  "nav.signIn": "Iniciar sesión",
  "nav.signUp": "Registrarse",
  "nav.cart": "Carrito",
  "nav.searchPlaceholder": "Buscar péptidos…",
  "header.hours": "Lun–Vie 9:00–17:00 EST",
  "banner.prefix": "",
  "banner.core": "ENVÍO GRATIS EN PEDIDOS MAYORES DE $200 USD · VERIFICADO POR HPLC ACREDITADO POR A2LA",

  "btn.addToCart": "Añadir al carrito",
  "btn.added": "¡Añadido!",
  "btn.subscribeAndAdd": "Suscribirse y añadir",
  "btn.viewDetails": "Ver detalles",
  "btn.continueShopping": "Seguir comprando",
  "btn.backToCatalog": "Volver al catálogo",
  "btn.checkout": "Pagar",
  "btn.placeOrder": "Realizar pedido",
  "btn.applyCode": "Aplicar",
  "btn.removeCode": "Quitar",
  "btn.yes": "Sí",
  "btn.no": "No",
  "btn.cancel": "Cancelar",
  "btn.confirm": "Confirmar",
  "btn.save": "Guardar",
  "btn.close": "Cerrar",

  "cart.title": "Tu carrito",
  "cart.empty.title": "Tu carrito está vacío",
  "cart.empty.body":
    "Explora el catálogo y añade algunos péptidos de investigación para empezar.",
  "cart.subtotal": "Subtotal",
  "cart.shipping": "Envío",
  "cart.shippingFree": "Gratis",
  "cart.discount": "Descuento",
  "cart.total": "Total",
  "cart.couponPlaceholder": "Código promocional",
  "cart.qty": "Cant.",
  "cart.remove": "Quitar",
  "cart.freeShippingProgress": "Añade {{amount}} más para envío gratis dentro de EE. UU.",
  "cart.freeShippingUnlocked": "Envío gratis dentro de EE. UU. desbloqueado",

  "pdp.purity": "Pureza",
  "pdp.casNumber": "Número CAS",
  "pdp.molarMass": "Masa molar",
  "pdp.size": "Tamaño",
  "pdp.freeShippingNote":
    "Envío gratis dentro de EE. UU. en pedidos mayores de $200, con seguimiento incluido.",
  "pdp.thirdPartyTested": "Probado por tercero",
  "pdp.researchUseOnly": "Solo para investigación in-vitro, no para uso humano",
  "pdp.relatedProducts": "Productos relacionados",
  "pdp.frequentlyBoughtTogether": "Frecuentemente comprados juntos",
  "pdp.bundleTotal": "Total del paquete",
  "pdp.addAllToCart": "Añadir todo al carrito",
  "pdp.viewBlend": "¿Buscas la mezcla {{name}}?",

  "checkout.title": "Pago",
  "checkout.shippingAddress": "Dirección de envío",
  "checkout.firstName": "Nombre",
  "checkout.lastName": "Apellido",
  "checkout.email": "Correo electrónico",
  "checkout.phone": "Teléfono",
  "checkout.address1": "Dirección",
  "checkout.address2": "Apto, suite, etc. (opcional)",
  "checkout.city": "Ciudad",
  "checkout.state": "Estado",
  "checkout.zip": "Código postal",
  "checkout.country": "País",
  "checkout.paymentMethod": "Método de pago",
  "checkout.card": "Tarjeta de crédito o débito",
  "checkout.ach": "Transferencia ACH",
  "checkout.achSavings": "Ahorra 5% con ACH",
  "checkout.cardSurcharge": "Cargo por procesamiento de tarjeta",
  "checkout.orderSummary": "Resumen del pedido",
  "checkout.statementDescriptor":
    "En tu estado de cuenta este cargo puede aparecer como INV u otro descriptor de nuestro procesador, no como Based Research.",

  "thanks.title": "Pedido confirmado",
  "thanks.subtitle": "Gracias. Nosotros nos encargamos del resto.",
  "thanks.orderNumber": "Número de pedido",
  "thanks.summary.title": "Lo que pediste",
  "thanks.next.title": "Qué sigue ahora",
  "thanks.reading.title": "Mientras esperas, lectura recomendada",
  "thanks.reading.subtitle":
    "Resúmenes de investigación de nuestro blog cubriendo los mecanismos relevantes a lo que acabas de pedir. Opcional. Guarda para después si prefieres.",
  "thanks.viewOrders": "Ver pedidos",

  "account.title": "Cuenta",
  "account.orders": "Pedidos",
  "account.subscriptions": "Suscripciones",
  "account.addresses": "Direcciones",
  "account.signOut": "Cerrar sesión",

  "footer.tagline":
    "Péptidos de investigación. Verificado por HPLC acreditado por A2LA.",
  "footer.shop": "Tienda",
  "footer.company": "Empresa",
  "footer.support": "Soporte",
  "footer.legal": "Legal",
  "footer.acceptedPayments": "Métodos de pago aceptados",
  "footer.researchUseOnly":
    "Solo para uso en investigación. No apto para consumo humano o animal.",

  "toggle.language": "Idioma",
  "toggle.currency": "Moneda",
  "toggle.settlesUsd": "se cobra en USD",

  "form.required": "Obligatorio",
  "form.invalidEmail": "Introduce un correo electrónico válido",
  "form.invalidPhone": "Introduce un número de teléfono válido",
  "form.loading": "Cargando…",
  "form.error": "Algo salió mal",

  "common.from": "Desde",
  "common.startingAt": "Desde",
  "common.eachShort": "cada uno",
  "common.save": "Ahorra",
  "common.off": "de descuento",
  "common.in": "en",
  "common.outOfStock": "Agotado",
};

const dictionaries: Record<Locale, Dictionary> = { en, es };

/**
 * Translate a key into the active display locale. Falls back to
 * English when the key is missing in Spanish (or when the locale is
 * "en"). Supports `{{var}}` interpolation for runtime values.
 *
 * Pure function — components that want re-render on locale change
 * should subscribe via useLocaleSubscription() in LocaleProvider.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[_displayLocale] ?? en;
  const fallback = en[key];
  const raw = dict[key] ?? fallback ?? key;
  if (!vars) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars[name];
    return v === undefined ? `{{${name}}}` : String(v);
  });
}
