"use client";

import { useConsent } from "./ConsentProvider";
import { Shield, X } from "lucide-react";
import { useState } from "react";

export default function ConsentBanner() {
  const { regime, status, grant, deny } = useConsent();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if: no regime, already decided, or dismissed
  if (!regime || status !== "pending" || dismissed) return null;

  if (regime === "gdpr") {
    return (
      <div className="fixed bottom-0 inset-x-0 z-[100] p-4 md:p-6">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm mb-1">Cookie Consent</h3>
              <p className="text-xs text-muted leading-relaxed">
                We use cookies and similar technologies to measure site performance and improve your experience.
                Analytics and marketing cookies require your consent under EU regulations (GDPR).
                You can change your preference at any time.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={grant}
                  className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-light transition-colors cursor-pointer"
                >
                  Accept All
                </button>
                <button
                  onClick={deny}
                  className="px-5 py-2 bg-accent text-foreground text-sm font-medium rounded-lg hover:bg-accent/80 transition-colors cursor-pointer"
                >
                  Reject Non-Essential
                </button>
                <a
                  href="/legal/privacy"
                  className="text-xs text-primary hover:underline"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
            <button
              onClick={() => { deny(); setDismissed(true); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CCPA banner — simpler opt-out model
  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-secondary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm mb-1">Your Privacy Choices</h3>
            <p className="text-xs text-muted leading-relaxed">
              We use cookies to analyze site traffic and optimize your experience.
              Under California law (CCPA), you have the right to opt out of the sale or sharing of your personal information.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={grant}
                className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary-light transition-colors cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={deny}
                className="px-5 py-2 bg-accent text-foreground text-sm font-medium rounded-lg hover:bg-accent/80 transition-colors cursor-pointer"
              >
                Do Not Sell My Info
              </button>
              <a
                href="/legal/privacy"
                className="text-xs text-primary hover:underline"
              >
                Privacy Policy
              </a>
            </div>
          </div>
          <button
            onClick={() => { grant(); setDismissed(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
