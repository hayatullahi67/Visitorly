import { CheckCircle2, ShieldCheck, Clock, Bell } from "lucide-react";

export function AuthShowcase() {
  return (
    <aside className="relative hidden lg:flex lg:w-[48%] xl:w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white">
      {/* Subtle dotted grid matching the landing page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40"
      />
      {/* Soft top-right ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"
      />

      {/* Top tag */}
      <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Estate-isolated digital gate control
      </div>

      {/* Product UI Preview */}
      <div className="relative z-10 my-auto py-8">
        <div className="mx-auto max-w-md space-y-4">
          {/* Simulated Gate Verification Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-400">Gate Check Terminal</p>
                  <p className="text-sm font-semibold text-white">Pass #YX8L7K</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valid Entry
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-xs">
              <div>
                <p className="text-slate-500">Visitor</p>
                <p className="mt-0.5 font-medium text-slate-200">Tunde Bakare</p>
              </div>
              <div>
                <p className="text-slate-500">Destination</p>
                <p className="mt-0.5 font-medium text-slate-200">House 14, Admiralty</p>
              </div>
              <div>
                <p className="text-slate-500">Host Resident</p>
                <p className="mt-0.5 font-medium text-slate-200">Engr. Biodun A.</p>
              </div>
              <div>
                <p className="text-slate-500">Verified By</p>
                <p className="mt-0.5 font-medium text-slate-200">Officer Musa I.</p>
              </div>
            </div>

            <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                15-min exit code supported
              </span>
              <span className="text-emerald-400 font-medium">Logged automatically</span>
            </div>
          </div>

          {/* Mini Notice Preview */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-800/90 bg-slate-900/60 px-4 py-3 text-xs">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Bell className="h-3.5 w-3.5" />
            </span>
            <p className="text-slate-300">
              <span className="font-semibold text-white">Estate Notice:</span>{" "}
              Water maintenance scheduled for Saturday, 10:00 AM – 2:00 PM.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-md">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Calm, verifiable access for every residential gate.
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              Issue 6-character visitor passes in seconds
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              Verify entries &amp; exits with named officer logs
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              Reach every resident and guard with estate notices
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom caption */}
      <p className="relative z-10 text-xs text-slate-500">
        Built for gated estates, residential courts &amp; private developments.
      </p>
    </aside>
  );
}
