"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, QrCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const purposes = [
  { value: "personal", label: "Personal Visit" },
  { value: "delivery", label: "Delivery" },
  { value: "maintenance", label: "Maintenance / Repair" },
  { value: "event_guest", label: "Event Guest" },
  { value: "other", label: "Other" },
];

export default function IssuePassPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    visitorName: "",
    phone: "",
    purpose: "personal",
    validFrom: "",
    validTo: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createdPass, setCreatedPass] = useState<{
    code: string;
    visitorName: string;
    validTo: string;
  } | null>(null);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Set default times when page loads
  useEffect(() => {
    const now = new Date();
    const later = new Date(now.getTime() + 4 * 60 * 60 * 1000); // +4 hours

    const toLocal = (d: Date) => {
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60 * 1000);
      return local.toISOString().slice(0, 16);
    };

    setForm((prev) => ({
      ...prev,
      validFrom: toLocal(now),
      validTo: toLocal(later),
    }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.visitorName.trim().length < 2) {
      setError("Please enter the visitor's full name");
      return;
    }

    if (!form.validFrom || !form.validTo) {
      setError("Please set the validity period");
      return;
    }

    if (new Date(form.validTo) <= new Date(form.validFrom)) {
      setError("End time must be after start time");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/estate/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: form.visitorName.trim(),
          phone: form.phone.trim() || undefined,
          purpose: form.purpose,
          validFrom: new Date(form.validFrom).toISOString(),
          validTo: new Date(form.validTo).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to create pass");
        return;
      }

      setCreatedPass({
        code: data.code || data.pass?.code || "------",
        visitorName: form.visitorName,
        validTo: form.validTo,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (createdPass) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Pass Created!</h2>
              <p className="text-slate-500 mt-1">
                Share this code with {createdPass.visitorName}
              </p>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-6 space-y-2">
              <p className="text-sm text-slate-400">Visitor Code</p>
              <p className="text-3xl font-mono font-bold tracking-widest">
                {createdPass.code}
              </p>
              <p className="text-xs text-slate-400">
                Valid until {new Date(createdPass.validTo).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => {
                  navigator.clipboard?.writeText(createdPass.code);
                }}
              >
                Copy Code
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard")}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCreatedPass(null);
                  setForm((prev) => ({
                    ...prev,
                    visitorName: "",
                    phone: "",
                    purpose: "personal",
                  }));
                }}
              >
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <Link
            href="/dashboard"
            className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <h1 className="font-semibold text-slate-900">Create Visitor Pass</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base">New Visitor Code</CardTitle>
                <p className="text-sm text-slate-500">
                  The code works once, only inside the time you set.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Input
                label="Visitor Full Name"
                placeholder="e.g. Chioma Adeyemi"
                value={form.visitorName}
                onChange={(e) => update("visitorName", e.target.value)}
                required
              />

              <Input
                label="Phone Number (optional)"
                type="tel"
                placeholder="+234 803 000 0000"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Purpose of Visit
                </label>
                <select
                  value={form.purpose}
                  onChange={(e) => update("purpose", e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {purposes.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Valid From"
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => update("validFrom", e.target.value)}
                  required
                />
                <Input
                  label="Valid Until"
                  type="datetime-local"
                  value={form.validTo}
                  onChange={(e) => update("validTo", e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                <QrCode className="h-4 w-4" />
                Create Visitor Code
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
