import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Bell, Building2, Check,
  CheckCircle2, ChevronRight, Clock3, Fingerprint, Home, LockKeyhole,
  QrCode, ShieldCheck, Smartphone, Users, UserRoundCheck, ScanLine,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import PWAInstall from "@/components/pwa-install";

const steps = [
  { number: "01", title: "Create a visitor pass", description: "Residents enter a visitor's details and create a secure pass in just a few moments.", icon: QrCode },
  { number: "02", title: "Share the pass", description: "A unique pass is ready to share with the expected visitor before they arrive.", icon: Smartphone },
  { number: "03", title: "Verify at the gate", description: "Security checks the pass, confirms the visit and records the gate entry.", icon: ScanLine },
];

const features = [
  { icon: QrCode, title: "Simple visitor passes", description: "Create and share visitor passes without paperwork or long phone calls." },
  { icon: ShieldCheck, title: "Smarter gate checks", description: "Give security officers a clear way to verify visitors and record arrivals." },
  { icon: Bell, title: "Stay informed", description: "Keep residents and estate teams informed about visitor activity." },
  { icon: Clock3, title: "Clear visit records", description: "Keep organised entry records that authorised estate teams can review." },
];

const audiences = [
  { icon: Home, title: "For residents", description: "Welcome guests with less stress. Create a pass before they arrive and know when they check in.", points: ["Create visitor passes", "Share access details", "Keep track of visits"] },
  { icon: Building2, title: "For estate managers", description: "Bring visitor operations into one organised place and maintain better oversight.", points: ["Manage estate access", "Oversee residents and teams", "Review visitor records"] },
  { icon: Fingerprint, title: "For security officers", description: "Make gate checks clearer and more consistent with a simple visitor verification process.", points: ["Verify visitor passes", "Record arrivals and exits", "Find visit details quickly"] },
];

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    if (session.mustChangePassword) redirect("/change-password");
    switch (session.role) {
      case "estate_admin": redirect("/admin");
      case "estate_security": redirect("/security");
      default: redirect("/dashboard");
    }
  }

  return (
    <main className="overflow-hidden bg-white text-slate-900">
      <header className="relative z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Visitorly home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><ShieldCheck className="h-6 w-6" /></span>
            <span className="text-xl font-bold tracking-tight">Visitorly<span className="text-indigo-600">.</span></span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="transition hover:text-indigo-600">How it works</a>
            <a href="#features" className="transition hover:text-indigo-600">Features</a>
            <a href="#who-its-for" className="transition hover:text-indigo-600">Who it's for</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <PWAInstall />
            <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex">Sign in</Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700">Get started <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <section className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.13),_transparent_48%),linear-gradient(to_bottom,_#f8faff,_#ffffff)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:pb-28">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> A simpler way to manage estate visitors
            </div>
            <h1 className="text-balance text-5xl font-bold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.35rem]">
              Welcome guests.<br /><span className="text-indigo-600">Stay in control.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              Visitorly helps residential estates manage visitor access with secure digital passes, clearer gate checks and organised visit records — all in one easy-to-use platform.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-sm font-semibold text-white shadow-xl shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700">Get started with Visitorly <ArrowRight className="h-4 w-4" /></Link>
              <a href="#how-it-works" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50">See how it works <ChevronRight className="h-4 w-4" /></a>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Easy to use</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Built for estates</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Works on mobile</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[590px]">
            <div className="absolute -left-8 top-16 h-40 w-40 rounded-full bg-indigo-200/60 blur-3xl" />
            <div className="absolute -right-8 bottom-8 h-48 w-48 rounded-full bg-sky-200/60 blur-3xl" />
            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_35px_100px_-35px_rgba(30,41,59,0.35)] sm:p-5">
              <div className="rounded-[1.45rem] bg-slate-50 p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Building2 className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-900">Estate access</p><p className="text-xs text-slate-500">Visitor overview</p></div></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">● Secure</span>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Today's visits</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">08</p><p className="mt-1 text-xs text-emerald-600">Visitor activity</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">At the gate</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">02</p><p className="mt-1 text-xs text-indigo-600">Awaiting verification</p></div>
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Visitor pass</p><p className="mt-1 text-xs text-slate-500">A quick look at a digital pass</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Active</span></div>
                  <div className="mt-5 flex items-center gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-indigo-50"><QrCode className="h-16 w-16 text-indigo-700" /></div>
                    <div className="min-w-0"><p className="font-semibold text-slate-900">Guest visit</p><p className="mt-1 text-xs text-slate-500">Invited by a resident</p><div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700"><BadgeCheck className="h-4 w-4" /> Ready for gate check</div></div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><UserRoundCheck className="h-5 w-5" /></span><div className="flex-1"><p className="text-xs font-semibold text-slate-800">Visitor check-in</p><p className="text-[11px] text-slate-500">A clear record for every arrival</p></div><Check className="h-4 w-4 text-emerald-600" /></div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:flex"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><LockKeyhole className="h-5 w-5" /></span><div><p className="text-xs font-bold text-slate-900">Access with confidence</p><p className="text-[11px] text-slate-500">One organised visitor process</p></div></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-slate-100 bg-slate-50/80 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">How it works</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">From invitation to entry, made simple.</h2><p className="mt-4 leading-7 text-slate-600">A straightforward process that helps residents prepare for guests and helps security teams verify visits at the gate.</p></div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step) => <article key={step.number} className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><span className="text-sm font-bold tracking-widest text-indigo-600">{step.number}</span><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><step.icon className="h-6 w-6" /></span></div><h3 className="mt-7 text-xl font-bold text-slate-900">{step.title}</h3><p className="mt-3 leading-7 text-slate-600">{step.description}</p></article>)}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div><p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-600">One connected experience</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Less paperwork. More organised access.</h2><p className="mt-5 max-w-lg leading-8 text-slate-600">Visitorly brings the essential parts of estate visitor management together, so residents, administrators and security officers can work from the same clear process.</p><Link href="/register" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">Explore Visitorly <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="grid gap-4 sm:grid-cols-2">{features.map((feature) => <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><feature.icon className="h-5 w-5" /></span><h3 className="mt-5 font-bold text-slate-900">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p></article>)}</div>
        </div>
      </section>

      <section id="who-its-for" className="scroll-mt-20 bg-slate-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-300">Designed for your community</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Everyone has a clearer role.</h2><p className="mt-4 leading-7 text-slate-400">A shared visitor process, with the right tools for each person.</p></div>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">{audiences.map((item) => <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[.04] p-7"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><item.icon className="h-6 w-6" /></span><h3 className="mt-6 text-xl font-bold">{item.title}</h3><p className="mt-3 min-h-[72px] leading-7 text-slate-400">{item.description}</p><ul className="mt-6 space-y-3">{item.points.map((point) => <li key={point} className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{point}</li>)}</ul></article>)}</div>
        </div>
      </section>

      <section className="bg-indigo-600 py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-indigo-200">A better way to welcome visitors</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Make every visit easier to manage.</h2><p className="mt-4 leading-7 text-indigo-100">Get started with Visitorly and bring more clarity to your estate's visitor process.</p></div><Link href="/register" className="inline-flex h-14 shrink-0 items-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50">Create your account <ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-slate-500 sm:px-8 md:flex-row"><Link href="/" className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Visitorly</Link><p>Visitor management, made simpler for residential estates.</p><div className="flex gap-5"><Link href="/login" className="hover:text-indigo-600">Sign in</Link><Link href="/register" className="hover:text-indigo-600">Create account</Link></div></div></footer>
    </main>
  );
}
