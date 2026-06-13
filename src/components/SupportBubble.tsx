"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useTracking } from "@/components/TrackingProvider";

const subjects = [
  "Product Question",
  "Order Support",
  "Shipping & Tracking",
  "Returns & Refunds",
  "Quality & Lab Results",
  "Other",
];

export default function SupportBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { track } = useTracking();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send message");
      } else {
        track({ event: "Contact", email: form.email });
        setSubmitted(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", email: "", subject: "", message: "" });
    setSubmitted(false);
    setError("");
  };

  return (
    <>
      {/* Bubble button.
          Position is offset by --sticky-cta-bottom-offset so it lifts
          above the product page's sticky Add-to-Cart bar when that bar
          is visible. When no sticky bar is mounted, the variable falls
          back to 0 and the bubble sits at its normal 1.5rem from the
          bottom. See ProductDetailClient.tsx for where the offset is
          set/cleared. */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) resetForm(); }}
        style={{ bottom: "calc(var(--sticky-cta-bottom-offset, 0px) + 1.5rem)" }}
        className="fixed right-6 z-[90] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-light transition-all hover:scale-105 flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
        aria-label={isOpen ? "Close support" : "Open support"}
      >
        {isOpen ? (
          <X className="w-6 h-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="w-6 h-6" aria-hidden="true" />
        )}
      </button>

      {/* Panel — same offset rule as the bubble so the panel anchors
          above the bubble even when the sticky CTA bar pushes both up. */}
      {isOpen && (
        <div
          style={{ bottom: "calc(var(--sticky-cta-bottom-offset, 0px) + 6rem)" }}
          className="fixed right-6 z-[90] w-[340px] max-h-[calc(100vh-160px)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-5 py-4 flex-shrink-0">
            <h3 className="font-semibold text-sm">Support</h3>
            <p className="text-xs text-white/70 mt-0.5">
              We typically respond within 24 hours.
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-success" aria-hidden="true" />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Message Sent!</h4>
                <p className="text-xs text-muted mb-4">
                  We&apos;ll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => { resetForm(); setIsOpen(false); }}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" /> {error}
                  </div>
                )}

                <div>
                  <label htmlFor="sb-name" className="block text-xs font-medium text-foreground mb-1">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="sb-name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="sb-email" className="block text-xs font-medium text-foreground mb-1">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="sb-email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="sb-subject" className="block text-xs font-medium text-foreground mb-1">
                    Topic <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="sb-subject"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    className={`w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${form.subject ? "text-foreground" : "text-muted"}`}
                  >
                    <option value="" disabled>Select a topic</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sb-message" className="block text-xs font-medium text-foreground mb-1">
                    Message <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="sb-message"
                    name="message"
                    required
                    rows={3}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary-light transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Sending...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" aria-hidden="true" /> Send Message</>
                  )}
                </button>

                <p className="text-[9px] text-muted text-center">
                  By submitting, you agree to our{" "}
                  <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
