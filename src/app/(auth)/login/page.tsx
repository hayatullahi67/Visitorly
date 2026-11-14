"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShowcase } from "@/components/auth-showcase";
import { ArrowLeft, ShieldCheck, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "EMAIL_NOT_VERIFIED") {
          router.push("/verify-email?email=" + encodeURIComponent(identifier));
          return;
        }
        setError(data.error?.message || "Login failed");
        return;
      }

      // Redirect based on role / mustChangePassword
      if (data.user.mustChangePassword) {
        router.push("/change-password");
        return;
      }

      if (data.user.isSuperAdmin) {
        router.push("/super-admin");
        return;
      }

      const activeMemberships =
        data.memberships?.filter(
          (m: any) =>
            m.status === "active" &&
            (m.organization.status === "active" ||
              (m.role === "estate_admin" &&
                (m.organization.status === "pending" || m.organization.status === "suspended")))
        ) || [];
      if (activeMemberships.length > 1) {
        router.push("/select-estate");
        return;
      }

      const active = activeMemberships[0];

      if (!active) {
        router.push("/pending");
        return;
      }

      switch (active.role) {
        case "estate_admin":
          router.push("/admin");
          break;
        case "estate_security":
          router.push("/security");
          break;
        case "resident":
        default:
          router.push("/dashboard");
          break;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-white text-slate-900">
      {/* Left: Clean, distraction-free form column */}
      <div className="flex flex-1 flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Visitorly home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-950">
              Visitorly<span className="text-indigo-600">.</span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>

        {/* Form container */}
        <div className="mx-auto my-12 w-full max-w-[380px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to access your resident, security, or estate admin portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Email or phone number"
              type="text"
              placeholder="name@example.com or +234..."
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              autoComplete="username"
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Sign in
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 hover:text-indigo-500 transition"
            >
              Create account
            </Link>
          </p>
        </div>

        {/* Bottom bar */}
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Visitorly &middot; Role-based estate access
        </p>
      </div>

      {/* Right: Architectural product showcase */}
      <AuthShowcase />
    </main>
  );
}
