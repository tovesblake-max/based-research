"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { Loader2, ArrowLeft, CheckCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSent(true);
    setLoading(false);
  };

  const inputClass = "w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/auth/sign-in" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to sign in
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-success" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl text-foreground mb-2">Check Your Email</h1>
            <p className="text-muted text-sm mb-6">
              If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <p className="text-xs text-muted">
              Didn&apos;t get it? Check your spam folder or{" "}
              <button onClick={() => setSent(false)} className="text-primary hover:underline cursor-pointer">
                try again
              </button>.
            </p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl text-foreground mb-2">Forgot Your Password?</h1>
            <p className="text-muted text-sm mb-6">
              Enter the email address on your account and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fp-email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              <Button variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> Sending...</>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
