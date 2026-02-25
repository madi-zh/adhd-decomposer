"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center pt-12">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">
          Check your email
        </h1>
        <p className="text-stone-500 mb-8 max-w-sm text-center">
          If an account exists with that email, we&apos;ve sent a password reset
          link. It will expire in 1 hour.
        </p>
        <Link
          href="/login"
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-12">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">
        Forgot your password?
      </h1>
      <p className="text-stone-500 mb-8">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-500">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
