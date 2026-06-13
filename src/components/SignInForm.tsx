"use client";

import Link from "next/link";
import Button from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { Shield, Truck, FileCheck, Loader2, FlaskConical, Smartphone } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Honor an explicit `?redirect=` (set by middleware when an
      // auth-required page bounced the user here) first. Otherwise
      // route by role: admins go straight to the dashboard, regular
      // customers to /account. Lets staff like Manuela land in the
      // surface they actually use without an extra tap.
      const explicit = searchParams.get("redirect");
      const roleDefault = result.user?.role === "admin" ? "/admin" : "/account";
      window.location.href = explicit || roleDefault;
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex">
      {/* Left Panel — Dark branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-footer-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/20" aria-hidden="true" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-col justify-center px-16 max-w-lg">
          <Link href="/" className="block mb-12" aria-label="Based Research home">
            <Image
              src="/images/site/logo-dark.png"
              alt="Based Research"
              width={200}
              height={50}
              className="h-10 w-auto"
            />
          </Link>

          <h1 className="font-serif text-4xl leading-tight mb-6">
            Welcome back.
          </h1>
          <p className="text-white/60 leading-relaxed">
            Sign in to access your account, view order history, and manage your
            research catalog.
          </p>

          <div className="space-y-4 mt-8">
            {[
              { icon: <FlaskConical className="w-4 h-4" aria-hidden="true" />, text: "A2LA-accredited HPLC verified, every batch" },
              { icon: <FileCheck className="w-4 h-4" aria-hidden="true" />, text: "Public, batch-linked certificates" },
              { icon: <Truck className="w-4 h-4" aria-hidden="true" />, text: "Free US shipping over $200" },
              { icon: <Shield className="w-4 h-4" aria-hidden="true" />, text: "99%+ purity guaranteed" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/70">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h2 className="font-serif text-3xl text-foreground mb-2">Sign In</h2>
          <p className="text-muted mb-8">
            Don&apos;t have an account?{" "}
            <Link href={`/auth/sign-up${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`} className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="signin-email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <Button variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Link
            href={`/auth/phone${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-lg border border-border bg-white hover:bg-accent/40 transition-colors text-sm font-medium text-foreground"
          >
            <Smartphone className="w-4 h-4" aria-hidden="true" />
            Sign in with phone number
          </Link>

          <p className="text-[10px] text-muted text-center mt-6 leading-relaxed">
            Products sold by Based Research are intended for research use only.
          </p>
        </div>
      </div>
    </div>
  );
}
