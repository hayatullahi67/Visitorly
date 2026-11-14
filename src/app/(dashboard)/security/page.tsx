"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PWAInstall from "@/components/pwa-install";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  LogOut,
  RefreshCw,
  UserCheck,
  Users,
  CalendarClock,
  ScrollText,
  Bell,
  Home,
  Phone,
  ArrowRightCircle,
  ArrowLeftCircle,
  Ban,
  KeyRound,
  Info,
} from "lucide-react";

type TabKey = "terminal" | "inside" | "expected" | "logs" | "notices";

interface GateStats {
  expected: number;
  insideNow: number;
  admittedToday: number;
  deniedToday: number;
  exitedToday: number;
}

interface OfficerInfo {
  name: string;
  email: string;
  role: string;
  assignedGate: string;
  shift: string;
  estateName: string;
  estateLocation: string | null;
}

interface LookupResult {
  verdict: "valid" | "expired" | "revoked" | "already_used" | "not_yet_valid" | "invalid";
  isExit: boolean;
  canAdmit: boolean;
  canLetOut: boolean;
  message: string;
  passId?: number | string;
  code: string;
  entryCode?: string;
  visitorName?: string;
  phone?: string | null;
  purpose?: string | null;
  status?: string;
  house?: string;
  hostName?: string;
  hostPhone?: string | null;
  createdByName?: string;
  createdByRole?: string;
  admittedByName?: string | null;
  validFrom?: string;
  validTo?: string;
  exitCodeValidTo?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
}

interface PassItem {
  id: number | string;
  code: string;
  visitorName: string;
  phone: string | null;
  purpose: string | null;
  status: "active" | "checked_in" | "checked_out" | "expired" | "revoked";
  effectiveStatus?: string;
  house: string | null;
  hostName: string | null;
  admittedByName: string | null;
  validFrom: string;
  validTo: string;
  exitCode: string | null;
  exitCodeValidTo: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

interface GateLogItem {
  id: number | string;
  code: string;
  visitorName: string;
  house: string | null;
  officerName: string;
  action: "entry" | "exit";
  result: "success" | "denied";
  reason: string | null;
  createdAt: string;
}

interface NoticeItem {
  id: number | string;
  title: string;
  body: string;
  tag: "general" | "maintenance" | "urgent";
  authorName?: string;
  createdBy?: string;
  createdAt: string;
}

const REFUSE_REASONS = [
  "Visitor not recognised",
  "Host not available",
  "Suspicious behaviour",
  "Pass details do not match visitor",
  "Other",
];

const MANUAL_EXIT_REASONS = [
  "Resident not answering",
  "Resident not at home",
  "Leaving with the resident",
  "Emergency",
  "Other",
];

export default function SecurityTerminalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("terminal");

  const [stats, setStats] = useState<GateStats>({
    expected: 0,
    insideNow: 0,
    admittedToday: 0,
    deniedToday: 0,
    exitedToday: 0,
  });
  const [officer, setOfficer] = useState<OfficerInfo | null>(null);
  const [insidePasses, setInsidePasses] = useState<PassItem[]>([]);
  const [expectedPasses, setExpectedPasses] = useState<PassItem[]>([]);
  const [logs, setLogs] = useState<GateLogItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Terminal lookup state
  const [code, setCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Search & filter state
  const [expectedSearch, setExpectedSearch] = useState("");
  const [insideSearch, setInsideSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "entry" | "exit" | "denied">("all");

  // Refuse Entry Modal state
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [refusePassId, setRefusePassId] = useState<number | string | null>(null);
  const [refuseVisitorName, setRefuseVisitorName] = useState("");
  const [selectedRefuseReason, setSelectedRefuseReason] = useState(REFUSE_REASONS[0]);
  const [customRefuseReason, setCustomRefuseReason] = useState("");

  // Check-Out / Exit Modal state
  const [checkoutTarget, setCheckoutTarget] = useState<PassItem | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<"code" | "manual">("code");
  const [exitCodeInput, setExitCodeInput] = useState("");
  const [selectedExitReason, setSelectedExitReason] = useState(MANUAL_EXIT_REASONS[0]);
  const [customExitReason, setCustomExitReason] = useState("");

  const fetchAllGateData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [statsRes, passesRes, logsRes, noticesRes] = await Promise.all([
        fetch("/api/estate/gate/stats"),
        fetch("/api/estate/passes"),
        fetch("/api/estate/logs"),
        fetch("/api/estate/notices"),
      ]);

      if (statsRes.status === 401) {
        router.push("/login");
        return;
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setOfficer(statsData.officer);
      }

      if (passesRes.ok) {
        const passesData = await passesRes.json();
        const allPasses: PassItem[] = passesData.passes || [];
        setInsidePasses(allPasses.filter((p) => p.status === "checked_in"));
        setExpectedPasses(allPasses.filter((p) => p.status === "active"));
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }

      if (noticesRes.ok) {
        const noticesData = await noticesRes.json();
        setNotices(noticesData.notices || []);
      }
    } catch (error) {
      console.error("Failed to load security gate data:", error);
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAllGateData();
  }, [fetchAllGateData]);

  async function runCodeLookup(codeToVerify: string) {
    if (!codeToVerify.trim()) return;
    setLookupLoading(true);
    setResult(null);
    setBanner(null);

    try {
      const res = await fetch("/api/estate/gate/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToVerify.trim().toUpperCase() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Gate lookup error:", err);
      setBanner({
        type: "error",
        text: "Failed to check pass code. Please check your connection.",
      });
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleLookupSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runCodeLookup(code);
  }

  async function handleAdmitVisitor(passId: number | string) {
    setActionLoading(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/estate/gate/passes/${passId}/admit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.message || "Could not admit visitor." });
        return;
      }
      setBanner({
        type: "success",
        text: data.message || "Visitor admitted into the estate.",
      });
      setCode("");
      setResult(null);
      await fetchAllGateData();
    } catch (error) {
      console.error("Admit visitor error:", error);
      setBanner({ type: "error", text: "Network error while admitting visitor." });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLetOutWithExitCode(passId: number | string, exitCodeUsed?: string) {
    setActionLoading(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/estate/gate/passes/${passId}/let-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: exitCodeUsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.message || "Could not let visitor out." });
        return;
      }
      setBanner({
        type: "success",
        text: data.message || "Visitor let out of the estate.",
      });
      setCode("");
      setResult(null);
      setCheckoutTarget(null);
      setExitCodeInput("");
      await fetchAllGateData();
    } catch (error) {
      console.error("Let out error:", error);
      setBanner({ type: "error", text: "Network error while letting visitor out." });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmRefuseEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!refusePassId) return;
    const finalReason =
      selectedRefuseReason === "Other"
        ? customRefuseReason.trim() || "Refused at gate"
        : selectedRefuseReason;

    setActionLoading(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/estate/gate/passes/${refusePassId}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.message || "Could not log refusal." });
        return;
      }
      setBanner({
        type: "success",
        text: data.message || "Entry refusal recorded in gate log.",
      });
      setRefuseModalOpen(false);
      setRefusePassId(null);
      setCustomRefuseReason("");
      setCode("");
      setResult(null);
      await fetchAllGateData();
    } catch (error) {
      console.error("Refuse entry error:", error);
      setBanner({ type: "error", text: "Network error while recording refusal." });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmCheckoutModal(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutTarget) return;

    if (checkoutMode === "code") {
      if (!exitCodeInput.trim()) {
        setBanner({ type: "error", text: "Please enter the visitor's 6-character exit code." });
        return;
      }
      await handleLetOutWithExitCode(checkoutTarget.id, exitCodeInput.trim().toUpperCase());
      return;
    }

    const finalReason =
      selectedExitReason === "Other" ? customExitReason.trim() : selectedExitReason;

    if (finalReason.length < 3) {
      setBanner({
        type: "error",
        text: "Please provide a clear reason (at least 3 characters) for manual check-out.",
      });
      return;
    }

    setActionLoading(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/estate/gate/passes/${checkoutTarget.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ type: "error", text: data.message || "Could not check out visitor." });
        return;
      }
      setBanner({
        type: "success",
        text: data.message || "Visitor checked out of the estate.",
      });
      setCheckoutTarget(null);
      setCustomExitReason("");
      await fetchAllGateData();
    } catch (error) {
      console.error("Manual checkout error:", error);
      setBanner({ type: "error", text: "Network error while checking out visitor." });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const verdictStyles: Record<
    string,
    { bg: string; border: string; text: string; label: string }
  > = {
    valid: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      label: result?.isExit ? "Valid Exit Code — Ready to Let Out" : "Valid Pass — Ready to Admit",
    },
    expired: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      label: result?.isExit ? "Expired Exit Code" : "Expired Pass",
    },
    revoked: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      label: "Cancelled Pass",
    },
    already_used: {
      bg: "bg-slate-100",
      border: "border-slate-300",
      text: "text-slate-800",
      label: result?.isExit ? "Exit Code Already Used" : "Pass Already Used",
    },
    not_yet_valid: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      label: "Not Active Yet",
    },
    invalid: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      label: "Unrecognised Code",
    },
  };

  const filteredExpected = expectedPasses.filter((p) => {
    const q = expectedSearch.toLowerCase();
    return (
      !q ||
      p.visitorName.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.house || "").toLowerCase().includes(q) ||
      (p.hostName || "").toLowerCase().includes(q)
    );
  });

  const filteredInside = insidePasses.filter((p) => {
    const q = insideSearch.toLowerCase();
    return (
      !q ||
      p.visitorName.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.house || "").toLowerCase().includes(q) ||
      (p.hostName || "").toLowerCase().includes(q)
    );
  });

  const filteredLogs = logs.filter((l) => {
    if (logFilter === "entry" && (l.action !== "entry" || l.result !== "success")) return false;
    if (logFilter === "exit" && l.action !== "exit") return false;
    if (logFilter === "denied" && l.result !== "denied") return false;
    const q = logSearch.toLowerCase();
    return (
      !q ||
      l.visitorName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      (l.house || "").toLowerCase().includes(q) ||
      l.officerName.toLowerCase().includes(q)
    );
  });

  const officerInitials = (officer?.name || "SO")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("") || "SO";

  const tabTitles: Record<TabKey, string> = {
    terminal: "Gate Check",
    inside: "Visitors Inside Now",
    expected: "Expected Visitors",
    logs: "Estate Gate Log",
    notices: "Notices & Duty Profile",
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:sticky lg:top-0 lg:h-screen">
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Visitorly home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-950">
              Visitorly<span className="text-indigo-600">.</span>
            </span>
          </Link>
        </div>

        {/* Duty Context & Primary Action */}
        <div className="p-4 space-y-3 border-b border-slate-100">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <p className="truncate text-xs font-semibold text-slate-900">
                {officer?.estateName || "Estate Security"}
              </p>
            </div>
            <p className="mt-1 truncate pl-4 text-xs text-slate-500">
              {officer?.assignedGate || "Main Gate"} &middot; {officer?.shift || "On Duty"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Verify Gate Code
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Gate Operations
            </p>
            <nav className="mt-2 space-y-1">
              {[
                { id: "terminal", label: "Gate Check", icon: ShieldCheck },
                {
                  id: "inside",
                  label: "Inside Now",
                  icon: Users,
                  badge: stats.insideNow,
                },
                {
                  id: "expected",
                  label: "Expected",
                  icon: CalendarClock,
                  badge: stats.expected,
                },
                { id: "logs", label: "Gate Log", icon: ScrollText },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as TabKey)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 ${
                          active ? "text-indigo-600" : "text-slate-400"
                        }`}
                      />
                      {item.label}
                    </span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          active
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Estate &amp; Duty
            </p>
            <nav className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab("notices")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === "notices"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Bell
                    className={`h-4 w-4 ${
                      activeTab === "notices" ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  Notices &amp; Duty
                </span>
                {notices.length > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      activeTab === "notices"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {notices.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom Officer Footer */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-slate-50 transition-colors">
            <button
              type="button"
              onClick={() => setActiveTab("notices")}
              className="flex min-w-0 items-center gap-2.5 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                {officerInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {officer?.name || "Security Officer"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {officer?.email || "On Duty"}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== RIGHT WORKSPACE ==================== */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white lg:hidden"
              aria-label="Visitorly home"
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-950">
                {tabTitles[activeTab]}
              </h2>
              <p className="truncate text-xs text-slate-500 lg:hidden">
                {officer?.estateName || "Estate"} &middot; {officer?.assignedGate || "Main Gate"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstall compact />
            <button
              type="button"
              onClick={fetchAllGateData}
              title="Refresh gate data"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
          {/* Global Status Banner */}
          {banner && (
            <div
              className={`flex items-center justify-between rounded-lg border p-4 text-sm font-medium ${
                banner.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {banner.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{banner.text}</span>
              </div>
              <button
                onClick={() => setBanner(null)}
                className="text-xs font-semibold underline opacity-75 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Separate 4-Column Stats Cards */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab("expected")}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-indigo-300 hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Expected Visitors
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                  <CalendarClock className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                {stats.expected}
              </p>
              <p className="mt-1 text-xs text-slate-400">Active passes waiting</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inside")}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-emerald-300 hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Inside Estate Now
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                  <Users className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                {stats.insideNow}
              </p>
              <p className="mt-1 text-xs text-slate-400">Checked in visitors</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setLogFilter("entry");
                setActiveTab("logs");
              }}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Let In Today
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                {stats.admittedToday}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {stats.exitedToday} checked out today
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setLogFilter("denied");
                setActiveTab("logs");
              }}
              className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-red-300 hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Refused Today
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-600">
                  <Ban className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                {stats.deniedToday}
              </p>
              <p className="mt-1 text-xs text-slate-400">Denied gate entries</p>
            </button>
          </div>

        {/* TAB 1: TERMINAL / GATE CHECK */}
        {activeTab === "terminal" && (
          <div className="space-y-6">
            {notices.length > 0 && (
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-900">
                        Latest Estate Notice
                      </span>
                      <span className="text-xs text-amber-800/80">
                        {new Date(notices[0].createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">
                      {notices[0].title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-700">
                      {notices[0].body}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("notices")}
                  className="shrink-0 self-start rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 sm:self-center"
                >
                  View All ({notices.length})
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Verify Visitor Entry or Exit Code
                  </h2>
                  <p className="text-xs text-slate-500">
                    Type the visitor&apos;s entry pass code (e.g.{" "}
                    <span className="font-mono font-semibold text-slate-700">VST-9042</span>) or
                    their 6-character resident exit code to verify.
                  </p>
                </div>
                {code && (
                  <button
                    type="button"
                    onClick={() => {
                      setCode("");
                      setResult(null);
                    }}
                    className="self-start text-xs font-semibold text-slate-500 hover:text-slate-800 sm:self-auto"
                  >
                    Clear Lookup
                  </button>
                )}
              </div>

              <form onSubmit={handleLookupSubmit} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter pass code or exit code..."
                    className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 font-mono text-lg font-bold uppercase tracking-wider text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {lookupLoading ? "Checking..." : "Check Code"}
                </button>
              </form>

              {/* Lookup Result Card */}
              {result && (
                <div
                  className={`mt-6 rounded-2xl border-2 p-6 ${
                    verdictStyles[result.verdict]?.bg || "bg-slate-50"
                  } ${verdictStyles[result.verdict]?.border || "border-slate-200"}`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      {result.verdict === "valid" ? (
                        <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
                      ) : result.verdict === "expired" ||
                        result.verdict === "not_yet_valid" ? (
                        <Clock className="h-8 w-8 shrink-0 text-amber-600" />
                      ) : result.verdict === "already_used" ? (
                        <AlertTriangle className="h-8 w-8 shrink-0 text-slate-600" />
                      ) : (
                        <XCircle className="h-8 w-8 shrink-0 text-red-600" />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              verdictStyles[result.verdict]?.text
                            }`}
                          >
                            {verdictStyles[result.verdict]?.label}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                              result.isExit
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {result.isExit ? "Exit Verification" : "Entry Verification"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {result.message}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/80 px-4 py-2 text-right font-mono text-sm font-bold text-slate-900">
                      {result.code}
                    </div>
                  </div>

                  {result.visitorName && (
                    <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200/70 pt-5 sm:grid-cols-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500">Visitor</div>
                        <div className="mt-0.5 font-bold text-slate-900">
                          {result.visitorName}
                        </div>
                        {result.phone && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
                            <Phone className="h-3 w-3" />
                            {result.phone}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-medium text-slate-500">
                          Destination & Host
                        </div>
                        <div className="mt-0.5 font-bold text-slate-900">{result.house}</div>
                        <div className="mt-0.5 text-xs text-slate-600">
                          Host: <span className="font-semibold">{result.hostName}</span>
                          {result.hostPhone ? ` (${result.hostPhone})` : ""}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-slate-500">
                          Purpose & Validity
                        </div>
                        <div className="mt-0.5 font-semibold text-slate-900">
                          {result.purpose || "General Visit"}
                        </div>
                        {result.validTo && (
                          <div className="mt-0.5 text-xs text-slate-600">
                            Valid until {new Date(result.validTo).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gate Officer Action Buttons */}
                  {result.passId && (
                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-5">
                      {result.canAdmit && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleAdmitVisitor(result.passId!)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <ArrowRightCircle className="h-4 w-4" />
                          {actionLoading ? "Recording..." : "Let Visitor In"}
                        </button>
                      )}

                      {result.canLetOut && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            handleLetOutWithExitCode(result.passId!, result.code)
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <ArrowLeftCircle className="h-4 w-4" />
                          {actionLoading ? "Recording..." : "Let Visitor Out"}
                        </button>
                      )}

                      {!result.isExit && result.status !== "checked_out" && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => {
                            setRefusePassId(result.passId!);
                            setRefuseVisitorName(result.visitorName || "Visitor");
                            setSelectedRefuseReason(REFUSE_REASONS[0]);
                            setCustomRefuseReason("");
                            setRefuseModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Ban className="h-4 w-4" />
                          Refuse Entry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Two-Column Quick Overview on Terminal Tab */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Visitors Inside Preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Visitors Currently Inside ({insidePasses.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Visitors who have checked in and have not exited yet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("inside")}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    View All
                  </button>
                </div>

                {insidePasses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    No visitors are currently checked in inside the estate.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {insidePasses.slice(0, 4).map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{v.visitorName}</span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                              {v.code}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {v.house || "Estate Common Area"} • Host: {v.hostName || "—"}
                          </div>
                          {v.checkedInAt && (
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Arrived {new Date(v.checkedInAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutTarget(v);
                            setCheckoutMode("code");
                            setExitCodeInput("");
                            setSelectedExitReason(MANUAL_EXIT_REASONS[0]);
                            setCustomExitReason("");
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          <ArrowLeftCircle className="h-3.5 w-3.5" />
                          Check Out
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expected Visitors Preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Expected at Gate ({expectedPasses.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Active passes created by residents awaiting arrival.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("expected")}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    View All
                  </button>
                </div>

                {expectedPasses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    No active visitor passes waiting right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expectedPasses.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{p.visitorName}</span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                              {p.code}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {p.house || "Estate Common Area"} • Host: {p.hostName || "—"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Valid until {new Date(p.validTo).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCode(p.code);
                            runCodeLookup(p.code);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Inspect Pass
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSIDE NOW */}
        {activeTab === "inside" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Visitors Inside the Estate ({insidePasses.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Let visitors out with their resident exit code or record a manual check-out
                  reason.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={insideSearch}
                  onChange={(e) => setInsideSearch(e.target.value)}
                  placeholder="Search inside visitors..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {filteredInside.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
                No checked-in visitors match your search.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInside.map((visitor) => {
                  const hasValidExitCode =
                    visitor.exitCode &&
                    visitor.exitCodeValidTo &&
                    new Date(visitor.exitCodeValidTo) > new Date();

                  return (
                    <div
                      key={visitor.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-slate-900">
                            {visitor.visitorName}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-800">
                            Entry: {visitor.code}
                          </span>
                          {hasValidExitCode && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              Exit Code Ready
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1 font-medium text-slate-800">
                            <Home className="h-3.5 w-3.5 text-slate-400" />
                            {visitor.house || "Estate Common Area"}
                          </span>
                          <span>Host: {visitor.hostName || "—"}</span>
                          {visitor.phone && <span>Phone: {visitor.phone}</span>}
                          {visitor.purpose && <span>Purpose: {visitor.purpose}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Checked in at{" "}
                          {visitor.checkedInAt
                            ? new Date(visitor.checkedInAt).toLocaleString()
                            : "—"}
                          {visitor.admittedByName
                            ? ` • Admitted by ${visitor.admittedByName}`
                            : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutTarget(visitor);
                            setCheckoutMode("code");
                            setExitCodeInput("");
                            setSelectedExitReason(MANUAL_EXIT_REASONS[0]);
                            setCustomExitReason("");
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          <ArrowLeftCircle className="h-4 w-4" />
                          Let Out / Check Out
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXPECTED VISITORS */}
        {activeTab === "expected" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Expected Visitor Passes ({expectedPasses.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Active passes issued by residents. Click &quot;Verify at Gate&quot; when the
                  visitor arrives.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={expectedSearch}
                  onChange={(e) => setExpectedSearch(e.target.value)}
                  placeholder="Search visitor, code, house..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {filteredExpected.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
                No expected visitor passes match your search.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpected.map((pass) => (
                  <div
                    key={pass.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-slate-900">
                          {pass.visitorName}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800">
                          {pass.code}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {pass.house || "Estate Common Area"}
                        </span>
                        <span>Host: {pass.hostName || "—"}</span>
                        {pass.phone && <span>Phone: {pass.phone}</span>}
                        {pass.purpose && <span>Purpose: {pass.purpose}</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Valid: {new Date(pass.validFrom).toLocaleString()} —{" "}
                        {new Date(pass.validTo).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCode(pass.code);
                          setActiveTab("terminal");
                          runCodeLookup(pass.code);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Verify at Gate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GATE LOG */}
        {activeTab === "logs" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Estate Gate Log</h2>
                <p className="text-xs text-slate-500">
                  Every entry, exit, and refusal recorded with the security officer&apos;s full
                  name.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "entry", label: "Entries" },
                    { id: "exit", label: "Exits" },
                    { id: "denied", label: "Refused" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setLogFilter(f.id as "all" | "entry" | "exit" | "denied")
                      }
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        logFilter === f.id
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Filter logs..."
                    className="w-full rounded-xl border border-slate-300 py-1.5 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none sm:w-56"
                  />
                </div>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500">
                No gate log entries found for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            log.result === "denied"
                              ? "bg-red-100 text-red-800"
                              : log.action === "entry"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {log.result === "denied"
                            ? "Entry Refused"
                            : log.action === "entry"
                            ? "Let In"
                            : "Let Out"}
                        </span>
                        <span className="font-bold text-slate-900">{log.visitorName}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                          {log.code}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Destination:{" "}
                        <span className="font-semibold">
                          {log.house || "Estate Common Area"}
                        </span>{" "}
                        • Officer:{" "}
                        <span className="font-semibold text-slate-800">
                          {log.officerName}
                        </span>
                      </div>
                      {log.reason && (
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Note / Reason: {log.reason}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: NOTICES & DUTY INFO */}
        {activeTab === "notices" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Estate Notices</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Official announcements and gate instructions from the Estate Administrator.
                </p>

                {notices.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                    No estate notices have been posted yet.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {notices.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                              n.tag === "urgent"
                                ? "bg-red-100 text-red-800"
                                : n.tag === "maintenance"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {n.tag}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="mt-2 font-bold text-slate-900">{n.title}</h3>
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                          {n.body}
                        </p>
                        <div className="mt-2 text-[11px] font-medium text-slate-400">
                          Posted by {n.authorName || n.createdBy || "Estate Admin"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">Officer Duty Profile</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your full name is automatically recorded on every gate decision you make.
                </p>

                <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Full Name</dt>
                    <dd className="font-semibold text-slate-900">
                      {officer?.name || "Security Officer"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Email Address</dt>
                    <dd className="font-medium text-slate-800">{officer?.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Estate</dt>
                    <dd className="font-semibold text-slate-900">
                      {officer?.estateName || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Assigned Gate & Shift</dt>
                    <dd className="font-semibold text-emerald-700">
                      {officer?.assignedGate || "Main Gate"} •{" "}
                      {officer?.shift || "Day Shift"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { id: "terminal", icon: ShieldCheck, label: "Gate" },
            { id: "inside", icon: Users, label: "Inside" },
            { id: "expected", icon: CalendarClock, label: "Expected" },
            { id: "logs", icon: ScrollText, label: "Logs" },
            { id: "notices", icon: Bell, label: "Notices" },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as TabKey)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODAL 1: REFUSE ENTRY */}
      {refuseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Refuse Gate Entry — {refuseVisitorName}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Select the reason for refusing entry. This decision will be logged under your
              name ({officer?.name}).
            </p>

            <form onSubmit={handleConfirmRefuseEntry} className="mt-4 space-y-4">
              <div className="space-y-2">
                {REFUSE_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium transition ${
                      selectedRefuseReason === r
                        ? "border-red-600 bg-red-50 text-red-900"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refuseReason"
                      value={r}
                      checked={selectedRefuseReason === r}
                      onChange={() => setSelectedRefuseReason(r)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    {r}
                  </label>
                ))}
              </div>

              {selectedRefuseReason === "Other" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Specify Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={customRefuseReason}
                    onChange={(e) => setCustomRefuseReason(e.target.value)}
                    placeholder="Enter reason for refusal..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-red-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefuseModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Confirm Refusal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECK OUT / LET OUT VISITOR */}
      {checkoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Let Out Visitor — {checkoutTarget.visitorName}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Destination: {checkoutTarget.house || "Estate Common Area"} (Host:{" "}
              {checkoutTarget.hostName || "—"})
            </p>

            {/* Mode Switcher */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setCheckoutMode("code")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  checkoutMode === "code"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Use Exit Code
              </button>
              <button
                type="button"
                onClick={() => setCheckoutMode("manual")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  checkoutMode === "manual"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                Manual Check-Out
              </button>
            </div>

            <form onSubmit={handleConfirmCheckoutModal} className="mt-4 space-y-4">
              {checkoutMode === "code" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Resident 15-Minute Exit Code
                  </label>
                  <input
                    type="text"
                    required
                    value={exitCodeInput}
                    onChange={(e) => setExitCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character exit code..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-base font-bold uppercase tracking-wider text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Ask the visitor for the exit code generated by their host resident. If
                    the resident is unavailable, switch to &quot;Manual Check-Out&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-700">
                    Reason for checking out without an exit code:
                  </div>
                  <div className="space-y-2">
                    {MANUAL_EXIT_REASONS.map((r) => (
                      <label
                        key={r}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-xs font-medium transition ${
                          selectedExitReason === r
                            ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="exitReason"
                          value={r}
                          checked={selectedExitReason === r}
                          onChange={() => setSelectedExitReason(r)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        {r}
                      </label>
                    ))}
                  </div>

                  {selectedExitReason === "Other" && (
                    <div>
                      <input
                        type="text"
                        required
                        value={customExitReason}
                        onChange={(e) => setCustomExitReason(e.target.value)}
                        placeholder="Enter reason (min 3 characters)..."
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading
                    ? "Recording..."
                    : checkoutMode === "code"
                    ? "Verify & Let Out"
                    : "Record Check-Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
