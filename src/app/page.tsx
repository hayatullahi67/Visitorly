import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BadgeCheck, Building2, ChevronDown,
  ClipboardCheck, Home, QrCode, ShieldCheck, Smartphone,
  Users, ScanLine,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import PWAInstall from "@/components/pwa-install";

const processSteps = [
  {
    number: "1",
    title: "The resident prepares for a visitor",
    description: "Before a guest arrives, the resident signs in to Visitorly, enters the visitor's details and creates a visit pass. The pass contains the information the gate team needs to check the visit.",
    icon: QrCode,
    detail: "For example: you are expecting a friend, family member or delivery. You create their pass before they reach the gate.",
  },
  {
    number: "2",
    title: "The resident shares the pass",
    description: "The resident sends the pass or its access code to the visitor. The visitor keeps it ready to show when they arrive at the estate entrance.",
    icon: Smartphone,
    detail: "The visitor does not need to manage the resident's account. They simply present the pass they were given.",
  },
  {
    number: "3",
    title: "Security checks the visitor",
    description: "At the entrance, the security officer checks the pass in Visitorly before allowing the visit to proceed, following the estate's access rules.",
    icon: ScanLine,
    detail: "This gives the gate team a consistent way to check expected visitors instead of relying only on verbal messages.",
  },
  {
    number: "4",
    title: "Gate activity is recorded",
    description: "Where the estate has enabled visit recording, authorised personnel can review the recorded gate activity.",
    icon: ClipboardCheck,
    detail: "Estate records help the appropriate team review visitor activity when needed.",
  },
];

const roleGuides = [
  {
    icon: Home,
    title: "Residents",
    intro: "You are expecting someone? Create a pass before they arrive.",
    steps: ["Sign in to your Visitorly account.", "Enter your visitor's details and create a pass.", "Share the pass or code with your visitor.", "Check your visitor activity from your account."],
  },
  {
    icon: ShieldCheck,
    title: "Security officers",
    intro: "A visitor arrives at the gate? Check their pass before proceeding.",
    steps: ["Open the security area using your assigned account.", "Check the visitor's pass or code.", "Confirm the visit details.", "Record the visitor's entry and exit according to estate procedure."],
  },
  {
    icon: Building2,
    title: "Estate administrators",
    intro: "You oversee the estate? Manage the people and access process.",
    steps: ["Use your administrator account.", "Manage estate members and access where authorised.", "Oversee visitor activity and gate operations.", "Review records to support estate security."],
  },
];

const faqs = [
  {
    question: "Does creating a Visitorly account automatically add me to an estate?",
    answer: "No. Creating an account gives you your personal Visitorly sign-in. An authorised estate administrator must separately create or assign your estate membership before you can use estate-specific features.",
  },
  {
    question: "Does my visitor need to create a Visitorly account?",
    answer: "The resident creates the visitor pass and shares it with the guest. The guest should keep the pass or code ready to present at the gate. They do not use the resident's account.",
  },
  {
    question: "Can I use Visitorly on my phone?",
    answer: "Yes. Visitorly is designed to work in a mobile browser. You can also install it on a supported device from the browser so it opens like an app from your home screen.",
  },
  {
    question: "Who can see estate visitor information?",
    answer: "Visitor information should only be available to people with the appropriate access in that estate, such as the resident concerned and authorised estate or security personnel.",
  },
  {
    question: "What if I have not been given an estate account?",
    answer: "Start by creating your personal account. Then contact your estate administrator so they can arrange the correct estate membership for you. Until your membership is active, you may see a pending-access message.",
  },
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
    <main className="bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-7">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Visitorly home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><ShieldCheck className="h-6 w-6" /></span>
            <span className="text-xl font-bold tracking-tight">Visitorly<span className="text-indigo-600">.</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-indigo-600">How it works</a>
            <a href="#for-everyone" className="hover:text-indigo-600">Who uses it</a>
            <a href="#getting-started" className="hover:text-indigo-600">Getting started</a>
            <a href="#faq" className="hover:text-indigo-600">FAQs</a>
          </nav>
          <div className="flex items-center gap-2">
            <PWAInstall />
            <Link href="/login" className="hidden rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex">Sign in</Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Create account <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Visitor management for residential estates</p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-[3.6rem]">
              Know who is coming to your estate — before they reach the gate.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Visitorly is a visitor management platform for residential estates. Residents use it to prepare visitor passes, visitors show those passes at the entrance, and security officers check them before a visit is allowed to proceed.
            </p>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Instead of depending only on calls, handwritten notes or messages passed around, your estate can use one clear digital process for preparing and checking visits.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Create your account <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-100">I already have an account</Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">New to Visitorly? Create your personal account first. Your estate administrator must arrange your estate membership before you can use estate-specific features.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.28)] sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div><p className="text-sm font-bold text-slate-900">A visitor's journey</p><p className="mt-1 text-xs text-slate-500">What happens from invitation to gate check</p></div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">4 simple steps</span>
            </div>
            <div className="space-y-5 pt-6">
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Home className="h-5 w-5" /></span>
                <div><p className="font-semibold text-slate-900">Resident creates a pass</p><p className="mt-1 text-sm leading-6 text-slate-600">The resident enters the guest's details before the visit.</p></div>
              </div>
              <div className="ml-5 h-5 border-l-2 border-dashed border-slate-200" />
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Smartphone className="h-5 w-5" /></span>
                <div><p className="font-semibold text-slate-900">Visitor receives the pass</p><p className="mt-1 text-sm leading-6 text-slate-600">The resident shares the pass or access code with the guest.</p></div>
              </div>
              <div className="ml-5 h-5 border-l-2 border-dashed border-slate-200" />
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ScanLine className="h-5 w-5" /></span>
                <div><p className="font-semibold text-slate-900">Security checks the pass</p><p className="mt-1 text-sm leading-6 text-slate-600">The visitor presents it at the gate for verification.</p></div>
              </div>
              <div className="ml-5 h-5 border-l-2 border-dashed border-slate-200" />
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-5 w-5" /></span>
                <div><p className="font-semibold text-slate-900">The visit is recorded</p><p className="mt-1 text-sm leading-6 text-slate-600">The security officer follows the estate's procedure for recording the visitor's arrival and departure.</p></div>
              </div>
            </div>
            <div className="mt-7 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">The goal is simple: residents know how to prepare for guests, visitors know what to show, and security knows what to check.</div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">How Visitorly works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A clear explanation of the full visitor process.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Each person has a simple responsibility. Here is what happens at every stage, and why it matters.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {processSteps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-slate-200 p-6 sm:p-7">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><step.icon className="h-5 w-5" /></span><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step {step.number}</span></div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-800">Example: </span>{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="for-everyone" className="scroll-mt-24 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Made for the people who use it</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What each person does in Visitorly.</h2><p className="mt-4 leading-7 text-slate-600">Visitorly has different access areas because residents, security officers and estate administrators do different jobs. Each person should sign in with their own assigned account.</p></div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {roleGuides.map((role) => (
              <article key={role.title} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><role.icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-xl font-bold">{role.title}</h3>
                <p className="mt-2 min-h-[72px] leading-6 text-slate-600">{role.intro}</p>
                <ol className="mt-6 space-y-4">
                  {role.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-slate-600"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{index + 1}</span>{step}</li>)}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="getting-started" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 rounded-3xl bg-indigo-950 p-7 text-white sm:p-10 lg:grid-cols-[1fr_.9fr] lg:items-center lg:p-14">
            <div><p className="text-sm font-bold uppercase tracking-wider text-indigo-300">Getting started</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your first steps with Visitorly.</h2><p className="mt-4 max-w-xl leading-7 text-indigo-100">You do not need to understand everything before you begin. Start with your personal account, then connect to the estate you belong to.</p><Link href="/register" className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-indigo-950 hover:bg-indigo-50">Create a personal account <ArrowRight className="h-4 w-4" /></Link></div>
            <div className="space-y-4">
              <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">1</span><div><p className="font-semibold">Register your details</p><p className="mt-1 text-sm leading-6 text-indigo-100">Enter your name, email address and password to create your personal account.</p></div></div>
              <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">2</span><div><p className="font-semibold">Sign in to your account</p><p className="mt-1 text-sm leading-6 text-indigo-100">Use the email address and password you registered with to access your account.</p></div></div>
              <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">3</span><div><p className="font-semibold">Ask your estate administrator to add you</p><p className="mt-1 text-sm leading-6 text-indigo-100">Your personal account does not automatically give you estate access. The estate administrator must arrange your membership.</p></div></div>
              <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">4</span><div><p className="font-semibold">Use your assigned dashboard</p><p className="mt-1 text-sm leading-6 text-indigo-100">After access is active, Visitorly takes you to the area for your role.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-3">
          <div className="flex gap-3"><Users className="h-6 w-6 shrink-0 text-indigo-600" /><div><h3 className="font-bold">Separate user access</h3><p className="mt-2 text-sm leading-6 text-slate-600">Residents, security officers and estate administrators use accounts with different permissions.</p></div></div>
          <div className="flex gap-3"><LockKeyholeIcon /><div><h3 className="font-bold">Access based on your role</h3><p className="mt-2 text-sm leading-6 text-slate-600">Your account should only show the estate tools you are authorised to use.</p></div></div>
          <div className="flex gap-3"><Smartphone className="h-6 w-6 shrink-0 text-indigo-600" /><div><h3 className="font-bold">Use it on your phone</h3><p className="mt-2 text-sm leading-6 text-slate-600">Open Visitorly in your browser or install it on a supported device for quick access from your home screen.</p></div></div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center"><p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Questions and answers</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Things you may want to know.</h2><p className="mt-4 leading-7 text-slate-600">Clear answers to common questions about accounts, visitors and estate access.</p></div>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq) => <details key={faq.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900"><span>{faq.question}</span><ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" /></summary><p className="mt-3 max-w-2xl pr-8 text-sm leading-7 text-slate-600">{faq.answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="bg-indigo-600 py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to make visitor access clearer?</h2><p className="mt-3 leading-7 text-indigo-100">Create your account and follow the steps to connect with your estate.</p></div>
          <Link href="/register" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Get started <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-slate-500 sm:px-8 md:flex-row">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Visitorly</Link>
          <p>Clearer visitor access for residential estates.</p>
          <div className="flex gap-5"><Link href="/login" className="hover:text-indigo-600">Sign in</Link><Link href="/register" className="hover:text-indigo-600">Create account</Link></div>
        </div>
      </footer>
    </main>
  );
}

function LockKeyholeIcon() {
  return <BadgeCheck className="h-6 w-6 shrink-0 text-indigo-600" />;
}
