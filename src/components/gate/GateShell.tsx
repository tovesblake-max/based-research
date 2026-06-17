import Image from "next/image";
import { ShieldCheck } from "lucide-react";

/**
 * Shared full-screen layout for the 3-stage access gate. Renders outside
 * the storefront chrome (see SiteChrome) so a visitor who has not cleared
 * the gate never sees catalog navigation. Shows a 3-step progress rail so
 * the funnel reads as a guided compliance flow, not a dead end.
 */

const STEPS = [
  { n: 1, label: "Research use" },
  { n: 2, label: "Your details" },
  { n: 3, label: "Verify" },
];

export default function GateShell({
  step,
  title,
  subtitle,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-accent/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image
            src="/images/site/logo-light.png"
            alt="Based Research"
            width={180}
            height={45}
            className="h-9 w-auto"
            priority
          />
        </div>

        {/* Progress rail */}
        <ol className="flex items-center justify-center gap-2 mb-8" aria-label="Access steps">
          {STEPS.map((s, i) => {
            const state = s.n < step ? "done" : s.n === step ? "current" : "upcoming";
            return (
              <li key={s.n} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold " +
                      (state === "done"
                        ? "bg-primary text-primary-foreground"
                        : state === "current"
                          ? "bg-primary/15 text-primary ring-2 ring-primary"
                          : "bg-card text-muted border border-border")
                    }
                    aria-current={state === "current" ? "step" : undefined}
                  >
                    {state === "done" ? "✓" : s.n}
                  </span>
                  <span
                    className={
                      "text-[10px] font-medium tracking-wide " +
                      (state === "upcoming" ? "text-muted" : "text-foreground")
                    }
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className={"w-8 h-px " + (s.n < step ? "bg-primary" : "bg-border")} aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-7">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-2xl text-foreground text-center mb-2">{title}</h1>
          {subtitle && <p className="text-sm text-muted text-center mb-6 leading-relaxed">{subtitle}</p>}
          {children}
        </div>

        <p className="text-[10px] text-muted/80 text-center leading-relaxed mt-6 max-w-sm mx-auto">
          Products are sold for laboratory research use only. Not for human or animal consumption, or for
          clinical, diagnostic, or therapeutic use. See our{" "}
          <a href="/legal/terms" className="text-primary hover:underline">Terms</a> and{" "}
          <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
