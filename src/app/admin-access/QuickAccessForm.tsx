"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export default function QuickAccessForm() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/quick-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign-in failed.");
        setSubmitting(false);
        return;
      }
      // Hard navigation so the new session cookie is read by the
      // server-rendered /admin layout. router.push() would re-use the
      // existing client cache.
      window.location.href = data.redirect || "/admin";
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="block text-[12px] font-medium text-muted mb-1.5">
          Access code
        </span>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoFocus
            spellCheck={false}
            className="w-full pl-9 pr-3 py-2 bg-accent/40 border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="••••••••"
            required
          />
        </div>
      </label>
      {error && (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || !code.trim()}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Continue"
        )}
      </button>
    </form>
  );
}
