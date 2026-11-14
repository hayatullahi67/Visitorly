import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  HeartHandshake,
  Home,
  KeyRound,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import PWAInstall from "@/components/pwa-install";

const problemPoints = [
  {
    title: "No more messy paper logbooks",
    description:
      "Handwritten gate books get torn, wet, or unreadable. When something happens, nobody can read the writing. Visitorly keeps clean digital records forever.",
  },
  {
    title: "No more gate traffic & endless calls",
    description:
      "Visitors and delivery riders no longer wait outside while guards call residents to confirm. A quick 6-character code gets verified in seconds.",
  },
  {
    title: "No more unverified strangers",
    description:
      "Every guest entering your estate is invited by a verified resident, and every exit is confirmed—giving families real peace of mind.",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Estate sets up the gate",
    description:
      "The estate admin adds streets and house numbers, then approves residents and security officers.",
    icon: Building2,
  },
  {
    number: "02",
    title: "Resident creates a pass",
    description:
      "Enter your guest's name to get a 6-character code and share it via WhatsApp. Guests need no app.",
    icon: QrCode,
  },
  {
    number: "03",
    title: "Security verifies entry",
    description:
      "At the gate, the officer checks the code, confirms the host and house, and lets the visitor in.",
    icon: ScanLine,
  },
  {
    number: "04",
    title: "Safe 15-min exit check",
    description:
      "When leaving, the resident generates a 15-minute exit code so security can log a safe departure.",
    icon: KeyRound,
  },
];

const societyBenefits = [
  {
    icon: ShieldCheck,
    title: "Safer neighbourhoods",
    description:
      "Every visitor is tied to a verified resident and house number, keeping strangers out.",
  },
  {
    icon: Clock,
    title: "Faster gate movement",
    description:
      "Pre-approved guest codes cut peak-hour queues down to a few seconds.",
  },
  {
    icon: ClipboardCheck,
    title: "Clear gate accountability",
    description:
      "Every entry, exit, and refusal is saved with the time and officer's full name.",
  },
  {
    icon: Bell,
    title: "Estate-wide notices",
    description:
      "Admins post announcements once and every resident and guard sees them immediately.",
  },
  {
    icon: HeartHandshake,
    title: "Smooth deliveries & artisans",
    description:
      "Dispatch riders and workers follow a respectful entry process with zero confusion.",
  },
  {
    icon: Smartphone,
    title: "No extra hardware needed",
    description:
      "Works on any smartphone or computer browser—no expensive gate machines required.",
  },
];

const roleGuides = [
  {
    icon: Home,
    title: "For Residents",
    badge: "Homeowners & Tenants",
    intro: "Welcome guests with zero phone tag.",
    steps: [
      "Select your estate, street, and house",
      "Create a 6-character visitor pass in seconds",
      "Share the code via WhatsApp or SMS",
      "Generate a 15-minute exit code on departure",
    ],
  },
  {
    icon: ShieldCheck,
    title: "For Security Officers",
    badge: "Gate & Patrol Team",
    intro: "Verify every arrival in one second.",
    steps: [
      "Select the estate you guard on sign-up",
      "Check entry or exit codes in Gate Check",
      "Confirm visitor, host, and house instantly",
      "Log entries, exits, and refusals under your name",
    ],
  },
  {
    icon: Building2,
    title: "For Estate Administrators",
    badge: "Chairmen & Managers",
    intro: "Full oversight with zero guesswork.",
    steps: [
      "Set up streets and house numbers",
      "Approve resident and security requests",
      "Monitor active passes and gate activity",
      "Broadcast Estate Notices to everyone",
    ],
  },
];

const faqs = [
  {
    question: "How do I join my estate on Visitorly?",
    answer:
      "Click 'Create account', fill in your details in Step 1, and in Step 2 choose whether you are a Resident (select your Estate, Street, and House) or Estate Security (select your Estate). Your estate administrator will review and approve your request.",
  },
  {
    question: "How does an Estate Administrator set up a new estate?",
    answer:
      "Choose 'Estate Admin' during Step 2 of registration and enter your estate name, physical address, city/state, and total houses. Your admin dashboard opens immediately so you can add streets, house numbers, and approve your community members.",
  },
  {
    question: "Does my visitor need to download an app or create an account?",
    answer:
      "No. You create the pass from your resident dashboard and send the 6-character code (or QR pass) to your guest via WhatsApp or text. They simply show that code to the security officer at the gate.",
  },
  {
    question: "What is a 15-minute exit code and why does it matter?",
    answer:
      "When a visitor is inside the estate and ready to leave, the resident generates a short-lived exit code valid for 15 minutes. Security verifies it at the gate before letting the guest out—protecting both residents and workers from unauthorised departures.",
  },
  {
    question: "Who is allowed to view the full Estate Gate Activity log?",
    answer:
      "Only authorised Security Officers and Estate Administrators belonging to that specific estate can view the gate activity log. Residents focus on their own visitor passes and estate notices.",
  },
];

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    if (session.mustChangePassword) redirect("/change-password");
    if (!session.membershipId || !session.organizationId || !session.role) {
      redirect("/pending");
    }
    switch (session.role) {
      case "estate_admin":
        redirect("/admin");
      case "estate_security":
        redirect("/security");
      default:
        redirect("/dashboard");
    }
  }

  return (
    <main className="bg-white text-slate-900">
      {/* Floating Pill Navigation */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-slate-200/90 bg-white/95 px-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] backdrop-blur sm:px-7">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Visitorly home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">
              Visitorly<span className="text-indigo-600">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#why-visitorly" className="hover:text-indigo-600 transition">
              Why Visitorly
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition">
              How it works
            </a>
            <a href="#society" className="hover:text-indigo-600 transition">
              Community
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <PWAInstall />
            <Link
              href="/login"
              className="hidden rounded-full px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition sm:text-sm"
            >
              Get Started <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>
      </div>

      {/* Centered Hero Section */}
      <section className="relative -mt-[72px] overflow-hidden border-b border-slate-100 bg-white pt-32 pb-20 sm:pt-36 sm:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-55"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white via-white/80 to-transparent"
        />

        <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Built for gated estates, residential courts &amp; private developments
          </p>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-[4rem]">
            Secure your estate gate,{" "}
            <span className="text-indigo-600">welcome guests in seconds.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Say goodbye to messy paper logbooks and long gate delays. Residents create a
            simple 6-character visitor pass on their phone, and security officers verify it at
            the gate in one second.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition sm:w-auto"
            >
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition sm:w-auto"
            >
              Sign in to your estate
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Free to start
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Works on any smartphone
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 15-min exit code protection
            </span>
          </div>
        </div>
      </section>

      {/* Why Visitorly / Problem & Motivation Section */}
      <section id="why-visitorly" className="scroll-mt-24 bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Why communities switch to Visitorly
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Your estate deserves better than torn paper books and gate confusion.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Peace of mind at home is priceless. When an estate relies on paper registers and
              verbal phone calls, security teams get overwhelmed and residents feel frustrated.
              Visitorly gives everyone a calmer, smarter, safer way to manage every visit.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {problemPoints.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              How it works
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Four simple steps from invitation to exit.
            </h2>
            <p className="mt-2.5 text-sm leading-6 text-slate-600 sm:text-base">
              No complicated training needed. Everyone in the estate follows one clear process.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step) => (
              <article
                key={step.number}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Societal & Community Impact */}
      <section id="society" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              Built for safer communities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              How Visitorly strengthens security and trust.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              When an estate knows who is coming in and going out, the entire community sleeps easier.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {societyBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-5"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <benefit.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{benefit.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Uses It */}
      <section id="for-everyone" className="scroll-mt-24 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              One platform, three dedicated portals
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Every person sees only what they need for their role.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Residents manage their guests, security officers focus on gate checks and logs,
              and estate administrators oversee the whole estate.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {roleGuides.map((role) => (
              <article
                key={role.title}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    <role.icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {role.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{role.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{role.intro}</p>
                <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                  {role.steps.map((step) => (
                    <li
                      key={step}
                      className="flex items-start gap-2.5 text-sm leading-5 text-slate-600"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started Banner */}
      <section id="getting-started" className="scroll-mt-24 pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 rounded-3xl bg-indigo-950 p-7 text-white sm:p-10 lg:grid-cols-[1fr_.95fr] lg:items-center lg:p-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                Start in 2 minutes
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Bring modern security to your estate today.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-indigo-100">
                Whether you are an estate chairman setting up a new community, a resident
                joining your street, or a security officer on gate duty—you can get started
                right from your phone.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-indigo-950 hover:bg-indigo-50 transition"
                >
                  Create your account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
                  1
                </span>
                <div>
                  <p className="font-semibold">Create your personal account</p>
                  <p className="mt-1 text-sm leading-6 text-indigo-100">
                    Enter your full name, email address, optional phone number, and password.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
                  2
                </span>
                <div>
                  <p className="font-semibold">Choose your role &amp; estate</p>
                  <p className="mt-1 text-sm leading-6 text-indigo-100">
                    Register a new estate as an Admin, or select your existing Estate, Street,
                    and House to join.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
                  3
                </span>
                <div>
                  <p className="font-semibold">Get approved &amp; go live</p>
                  <p className="mt-1 text-sm leading-6 text-indigo-100">
                    Once your estate admin approves your request, your portal unlocks
                    automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
              Questions and answers
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to know.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Straightforward answers about accounts, visitor codes, exit codes, and estate
              security.
            </p>
          </div>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  <span>{faq.question}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-2xl pr-8 text-sm leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 pt-14 pb-10 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                Visitorly
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
                Digital visitor passes, fast gate verification, and estate-wide notices built
                for residential communities.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Works on mobile &amp; desktop browsers
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Platform
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <li>
                    <a href="#why-visitorly" className="hover:text-indigo-600 transition">
                      Why Visitorly
                    </a>
                  </li>
                  <li>
                    <a href="#how-it-works" className="hover:text-indigo-600 transition">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#society" className="hover:text-indigo-600 transition">
                      Community impact
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="hover:text-indigo-600 transition">
                      FAQs
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Portals
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <li>
                    <a href="#for-everyone" className="hover:text-indigo-600 transition">
                      Residents
                    </a>
                  </li>
                  <li>
                    <a href="#for-everyone" className="hover:text-indigo-600 transition">
                      Security Officers
                    </a>
                  </li>
                  <li>
                    <a href="#for-everyone" className="hover:text-indigo-600 transition">
                      Estate Administrators
                    </a>
                  </li>
                  <li>
                    <a href="#getting-started" className="hover:text-indigo-600 transition">
                      Getting started
                    </a>
                  </li>
                </ul>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Access
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <li>
                    <Link href="/login" className="hover:text-indigo-600 transition">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-indigo-600 transition">
                      Create account
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-indigo-600 transition">
                      Register an estate
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
            <p>&copy; {new Date().getFullYear()} Visitorly. All rights reserved.</p>
            <p>Built for gated estates, residential courts &amp; private developments.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
