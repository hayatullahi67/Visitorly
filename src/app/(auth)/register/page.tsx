"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message || "Registration failed.");
        return;
      }
      router.push("/verify-email?email=" + encodeURIComponent(form.email));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Visitorly</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-2 text-slate-600">Create your personal Visitorly account. This account is your sign-in; your estate administrator must separately arrange your estate access.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">\n          <p className="rounded-lg bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-900">Use an email address you can access. Your name and contact details help identify your account. Your password must contain at least 8 characters.</p>
          {error && <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Input label="Full Name" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required placeholder="e.g. Adewale Johnson" />
          <Input label="Email Address" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required placeholder="you@email.com" />
          <Input label="Phone Number (optional)" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+234 803 000 0000" />\n          <p className="-mt-2 text-xs leading-5 text-slate-500">Add a phone number if you want your estate team to have another way to identify or contact you.</p>
          <Input label="Password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required placeholder="At least 8 characters" />
          <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required placeholder="Repeat your password" />
          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>Create Account</Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
