"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/Button";
import GateShell from "@/components/gate/GateShell";

export default function ResearchUseGate({ redirect }: { redirect?: string }) {
  const router = useRouter();
  const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";

  const [age, setAge] = useState(false);
  const [ruo, setRuo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = age && ruo;

  async function submit() {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/gate/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not continue. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`${data.next || "/gate/contact"}${qs}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <GateShell
      step={1}
      title="Research use confirmation"
      subtitle="This site is restricted to qualified researchers. Confirm the statements below to continue."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
        noValidate
      >
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <label className="flex gap-3 items-start cursor-pointer select-none">
          <input
            type="checkbox"
            checked={age}
            onChange={(e) => setAge(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border-strong text-primary focus:ring-primary/30 flex-shrink-0"
          />
          <span className="text-xs text-muted leading-relaxed">
            I am at least <strong className="text-foreground">21 years of age</strong> and a qualified
            researcher or institutional professional.
          </span>
        </label>

        <label className="flex gap-3 items-start cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ruo}
            onChange={(e) => setRuo(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border-strong text-primary focus:ring-primary/30 flex-shrink-0"
          />
          <span className="text-xs text-muted leading-relaxed">
            I confirm that all products are strictly for lawful{" "}
            <strong className="text-foreground">Research Use Only</strong> — not for human or animal use,
            consumption, or for clinical, diagnostic, or therapeutic purposes. I accept full responsibility
            for compliance with all applicable laws and regulations, assume all risks associated with
            handling research materials, and agree to hold the company harmless from any resulting claims
            or liabilities.
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full" disabled={!canContinue || submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Continuing…
            </>
          ) : (
            "I confirm — continue"
          )}
        </Button>
      </form>
    </GateShell>
  );
}
