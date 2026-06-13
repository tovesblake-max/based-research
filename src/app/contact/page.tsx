import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import { Mail, Clock, MapPin, MessageSquare, ShieldCheck, Headphones } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | Based Research",
  description:
    "Get in touch with our team. We're here to help with product questions, order support, and research inquiries.",
  openGraph: {
    title: "Contact Us | Based Research",
    description:
      "Get in touch with our team for product questions, order support, and research inquiries.",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium text-white/70 tracking-wide uppercase mb-3">
            Get in Touch
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">
            Contact Us
          </h1>
          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            Have a question about our products, need help with an order, or want to learn more about our research peptides? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Contact Info Cards + Form */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mx-auto mb-4">
                <Mail className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Email Us</h3>
              <a
                href="mailto:support@basedresearch.com"
                className="text-sm text-primary hover:underline"
              >
                support@basedresearch.com
              </a>
              <p className="text-xs text-muted mt-1">We respond within 24 hours</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <Clock className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Business Hours</h3>
              <p className="text-sm text-muted">Mon - Fri: 9AM - 5PM EST</p>
              <p className="text-xs text-muted mt-1">Excluding holidays</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-warm/10 flex items-center justify-center text-warm mx-auto mb-4">
                <MapPin className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Location</h3>
              <p className="text-sm text-muted">[Registered business address]</p>
              <p className="text-xs text-muted mt-1">United States</p>
            </div>
          </div>

          {/* Form + Side Info */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Form */}
            <div className="lg:col-span-3">
              <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                Send Us a Message
              </h2>
              <p className="text-muted text-sm mb-6">
                Fill out the form below and our team will get back to you as soon as possible.
              </p>
              <ContactForm />
            </div>

            {/* Side Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-accent/50 rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Common Topics</h3>
                <div className="space-y-3">
                  {[
                    { icon: <MessageSquare className="w-4 h-4" aria-hidden="true" />, label: "Product Questions", desc: "Peptide specifications, storage, and handling" },
                    { icon: <Headphones className="w-4 h-4" aria-hidden="true" />, label: "Order Support", desc: "Tracking, shipping, and order modifications" },
                    { icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />, label: "Quality & Testing", desc: "COA requests, purity, and lab results" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2">Need Immediate Help?</h3>
                <p className="text-sm text-muted mb-3">
                  Check our FAQ for instant answers to common questions about ordering, shipping, returns, and product handling.
                </p>
                <a
                  href="/faq"
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Visit FAQ &rarr;
                </a>
              </div>

              <div className="bg-primary/5 rounded-xl border border-primary/10 p-6">
                <p className="text-xs text-muted leading-relaxed">
                  <strong className="text-foreground">For Research Use Only.</strong>{" "}
                  Our support team can assist with product specifications, order logistics, and general inquiries. We cannot provide medical advice, dosing recommendations, or guidance on human use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
