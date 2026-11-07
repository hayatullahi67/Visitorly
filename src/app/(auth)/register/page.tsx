"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Home, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "resident",
    title: "Resident",
    description: "Create visitor passes for your house",
    icon: Home,
  },
  {
    id: "estate_admin",
    title: "Estate Admin",
    description: "Manage the entire estate, members & gates",
    icon: User,
  },
  {
    id: "estate_security",
    title: "Security Officer",
    description: "Scan codes and control gate entry/exit",
    icon: ShieldCheck,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          role: selectedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Registration failed");
        return;
      }

      // After register, go to login or pending
      router.push("/login?registered=1");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Visitorly</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {step === 1 ? "Choose your role" : "Create your account"}
          </h1>
          <p className="mt-2 text-slate-600">
            {step === 1
              ? "Select how you will use Visitorly in your estate"
              : "Fill in your details to get started"}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    isSelected
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg p-2.5",
                      isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{role.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>
                  </div>
                </button>
              );
            })}

            <Button
              className="w-full mt-4"
              size="lg"
              disabled={!selectedRole}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              required
              placeholder="e.g. Adewale Johnson"
            />
            <Input
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              placeholder="you@email.com"
            />
            <Input
              label="Phone Number (optional)"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+234 803 000 0000"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              required
              placeholder="Repeat your password"
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" isLoading={isLoading}>
                Create Account
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
