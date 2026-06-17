"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Button from "@/components/Button";
import GateShell from "@/components/gate/GateShell";

const input =
  "w-full h-11 px-3.5 rounded-lg border border-border-strong bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export default function ContactGate({ redirect }: { redirect?: string }) {
  const router = useRouter();
  const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = firstName.trim() && lastName.trim() && email.trim() && phone.trim();

  async function submit() {
    if (!complete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/gate/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.next) {
          router.push(`${data.next}${qs}`);
          return;
        }
        setError(data.error || "Could not continue. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`${data.next || "/gate/verify"}${qs}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <GateShell
      step={2}
      title="Your details"
      subtitle="Tell us who you are. We use this to keep a record of who accesses research materials."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
        noValidate
      >
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            className={input}
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />
          <input
            className={input}
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
        <input
          className={input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className={input}
          type="tel"
          inputMode="tel"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          required
        />

        <div className="pt-2">
          <Button type="submit" size="lg" className="w-full" disabled={!complete || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Continuing…
              </>
            ) : (
              "Continue to verification"
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted text-center">
          Next, we&apos;ll verify your phone number with a one-time code.
        </p>
      </form>
    </GateShell>
  );
}
