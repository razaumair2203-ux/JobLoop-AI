"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2 } from "lucide-react";

type AuthMode = "signin" | "signup";

const features = [
  "Evidence-based CV tailoring from your real experience",
  "Transparent analysis — no black boxes or opaque scores",
  "Your advocate, never your gatekeeper",
  "Socratic questions that surface hidden strengths",
];

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "linkedin_oidc") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-1">
        <div className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-0 p-8 text-center">
          <h2 className="text-lg font-semibold text-surface-text">Check your email</h2>
          <p className="mt-2 text-sm text-surface-text-secondary">
            We sent a confirmation link to <strong className="text-surface-text">{email}</strong>. Click the
            link to complete your signup.
          </p>
          <button
            onClick={() => setCheckEmail(false)}
            className="mt-6 text-sm text-surface-text-muted hover:text-surface-text transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-zinc-950 p-12 lg:flex dark:bg-zinc-900 relative overflow-hidden">
        {/* Subtle dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Gradient orb */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <Image src="/parrot.jpg" alt="JobLoop" width={36} height={36} className="rounded-lg" />
          <div>
            <h1 className="text-xl font-semibold text-white">JobLoop</h1>
            <p className="text-xs text-zinc-500">Your voice, amplified</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-2xl font-semibold leading-snug tracking-tight text-white">
            Your career story,{" "}
            <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
              told with evidence.
            </span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            The job search assistant that learns your story and helps you tell it
            in every employer&apos;s language.
          </p>
          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                <span className="text-sm text-zinc-400">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-zinc-700">JobLoop AI</p>
      </div>

      {/* Right: Auth Form */}
      <div className="flex w-full items-center justify-center bg-surface-0 p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Image src="/parrot.jpg" alt="JobLoop" width={28} height={28} className="rounded" />
            <h1 className="text-lg font-semibold text-surface-text">JobLoop</h1>
          </div>

          <h2 className="text-lg font-semibold text-surface-text">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-0.5 text-sm text-surface-text-muted">
            {mode === "signin"
              ? "Sign in to continue your job search"
              : "Start your evidence-backed job search"}
          </p>

          {/* OAuth buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => handleOAuth("google")}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-0 text-sm font-medium text-surface-text transition-all duration-150 hover:bg-surface-2 press focus-ring"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth("linkedin_oidc")}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-0 text-sm font-medium text-surface-text transition-all duration-150 hover:bg-surface-2 press focus-ring"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              Continue with LinkedIn
            </button>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-surface-border" />
            <span className="text-xs text-surface-text-muted">or</span>
            <div className="h-px flex-1 bg-surface-border" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <div>
                <label htmlFor="fullName" className="block text-xs font-medium text-surface-text-secondary">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-surface-border bg-surface-0 px-3 py-1.5 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-surface-text-secondary">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-surface-border bg-surface-0 px-3 py-1.5 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-surface-text-secondary">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-surface-border bg-surface-0 px-3 py-1.5 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
                placeholder="Min. 6 characters"
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-9 w-full rounded-md bg-brand-600 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 disabled:opacity-50 press focus-ring"
            >
              {loading
                ? "Loading..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="mt-5 text-center text-xs text-surface-text-muted">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-medium text-surface-text-secondary hover:text-surface-text transition-colors"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
