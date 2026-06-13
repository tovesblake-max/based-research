"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/Button";
import { Suspense } from "react";
import { Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-2xl text-foreground mb-2">Invalid Reset Link</h1>
        <p className="text-muted text-sm mb-6">This link is missing or invalid.</p>
        <Link href="/auth/forgot-password">
          <Button variant="primary" size="md">Request a New Link</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-success" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-2xl text-foreground mb-2">Password Reset!</h1>
        <p className="text-muted text-sm mb-6">Your password has been updated. You can now sign in with your new password.</p>
        <Link href="/auth/sign-in">
          <Button variant="primary" size="lg" className="w-full">Sign In</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <>
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-primary" aria-hidden="true" />
      </div>
      <h1 className="font-serif text-2xl text-foreground mb-2">Set New Password</h1>
      <p className="text-muted text-sm mb-6">Choose a strong password for your account.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="rp-password" className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
          <input
            id="rp-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="rp-confirm" className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
          <input
            id="rp-confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm your password"
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> Resetting...</>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
