import Link from "next/link";
import { ShieldCheck, Clock3 } from "lucide-react";

export default function PendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Clock3 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Estate access pending</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your Visitorly account is ready, but it is not connected to an active estate yet.
          Once you request access and the estate administrator approves it, you can use Visitorly.
        </p>
        <Link href="/login" className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
          <ShieldCheck className="h-4 w-4" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
