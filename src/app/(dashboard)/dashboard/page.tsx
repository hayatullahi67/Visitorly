"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Users,
  Bell,
  Plus,
  LogOut,
  Home,
  History,
  User,
  Search,
  Copy,
  Share2,
  Ban,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  X,
  ArrowRightLeft,
  KeyRound,
  ChevronRight,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TabType = "home" | "passes" | "issue" | "notices" | "profile";

type VisitorPassItem = {
  id: number;
  code: string;
  visitorName: string;
  phone?: string | null;
  purpose: string;
  status: "active" | "checked_in" | "checked_out" | "revoked";
  effectiveStatus: "active" | "checked_in" | "checked_out" | "revoked" | "expired";
  validFrom: string;
  validTo: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  revokedAt?: string | null;
  exitCode?: string | null;
  exitCodeValidTo?: string | null;
  house?: string | null;
  hostName?: string | null;
  createdByName?: string | null;
  admittedByName?: string | null;
};

type NoticeItem = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  authorName: string;
};

type StreetOption = {
  id: number;
  name: string;
  houses: { id: number; number: string }[];
};

const statusVariant: Record<
  string,
  "success" | "warning" | "secondary" | "danger" | "default"
> = {
  active: "success",
  checked_in: "warning",
  checked_out: "secondary",
  revoked: "danger",
  expired: "secondary",
};

const purposeLabels: Record<string, string> = {
  personal: "Personal Visit",
  delivery: "Delivery",
  maintenance: "Maintenance / Repair",
  event_guest: "Event Guest",
  other: "Other",
};

function toLocalDatetimeValue(d: Date): string {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ResidentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User & Active Membership context
  const [userFullName, setUserFullName] = useState("Resident");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [estateId, setEstateId] = useState<number | null>(null);
  const [estateName, setEstateName] = useState("My Estate");
  const [estateAddress, setEstateAddress] = useState("");
  const [estateCity, setEstateCity] = useState("");
  const [houseInfo, setHouseInfo] = useState<{
    id: number;
    number: string;
    street: string;
  } | null>(null);
  const [requestedHouseInfo, setRequestedHouseInfo] = useState<{
    id: number;
    number: string;
    street: string;
  } | null>(null);
  const [hasMultipleEstates, setHasMultipleEstates] = useState(false);

  // Dashboard Stats & Data
  const [stats, setStats] = useState({
    activePasses: 0,
    insideNow: 0,
    totalPasses: 0,
    notices: 0,
  });
  const [passes, setPasses] = useState<VisitorPassItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [estateStreets, setEstateStreets] = useState<StreetOption[]>([]);

  // Filter & Search for Passes tab
  const [passFilter, setPassFilter] = useState<string>("all");
  const [passSearch, setPassSearch] = useState<string>("");

  // Selected Pass Modal (Details, Share, Revoke, Exit Code)
  const [selectedPass, setSelectedPass] = useState<VisitorPassItem | null>(null);
  const [revokingPass, setRevokingPass] = useState(false);
  const [generatingExitCode, setGeneratingExitCode] = useState(false);

  // Issue Pass Form State
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [purpose, setPurpose] = useState("personal");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [issuingPass, setIssuingPass] = useState(false);
  const [newlyCreatedPass, setNewlyCreatedPass] =
    useState<VisitorPassItem | null>(null);

  // House Move Request State
  const [moveStreetId, setMoveStreetId] = useState("");
  const [moveHouseId, setMoveHouseId] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Feedback banners
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resetValidityWindow = useCallback((hours = 4) => {
    const now = new Date();
    const later = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setValidFrom(toLocalDatetimeValue(now));
    setValidTo(toLocalDatetimeValue(later));
  }, []);

  useEffect(() => {
    resetValidityWindow(4);
  }, [resetValidityWindow]);

  const loadAllData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json();
        setUserFullName(meData.user?.fullName || "Resident");
        setUserEmail(meData.user?.email || "");
        setUserPhone(meData.user?.phone || "");

        const activeList = (meData.memberships || []).filter(
          (m: any) => m.status === "active" && m.organization.status === "active"
        );
        setHasMultipleEstates(activeList.length > 1);

        const active =
          (meData.memberships || []).find(
            (m: any) => m.id === meData.activeMembershipId
          ) || activeList[0];

        if (!active) {
          router.replace("/pending");
          return;
        }

        if (active.role === "estate_admin") {
          router.replace("/admin");
          return;
        }
        if (active.role === "estate_security") {
          router.replace("/security");
          return;
        }

        setEstateId(active.organization.id);
        setEstateName(active.organization.name || "My Estate");
        setEstateAddress(active.organization.address || "");
        setEstateCity(active.organization.city || "");
        setHouseInfo(active.house || null);
        setRequestedHouseInfo(active.requestedHouse || null);

        const [passesRes, noticesRes, estatesRes] = await Promise.all([
          fetch("/api/estate/passes?status=all"),
          fetch("/api/estate/notices"),
          fetch("/api/estates"),
        ]);

        if (passesRes.ok) {
          const passesData = await passesRes.json();
          setPasses(passesData.passes || []);
          if (passesData.stats) {
            setStats(passesData.stats);
          }
        }

        if (noticesRes.ok) {
          const noticesData = await noticesRes.json();
          const loadedNotices = noticesData.notices || [];
          setNotices(loadedNotices);
          setStats((prev) => ({ ...prev, notices: loadedNotices.length }));
        }

        if (estatesRes.ok) {
          const estatesData = await estatesRes.json();
          const currentEstate = (estatesData.estates || []).find(
            (e: any) => e.id === active.organization.id
          );
          if (currentEstate?.streets) {
            setEstateStreets(currentEstate.streets);
          }
        }
      } catch (err) {
        console.error("Resident dashboard load error:", err);
        setErrorMsg("Unable to load your resident dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  function clearMessages() {
    setErrorMsg("");
    setSuccessMsg("");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function handleIssuePass(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();

    if (visitorName.trim().length < 2) {
      setErrorMsg("Please enter the visitor's full name.");
      return;
    }

    if (!validFrom || !validTo) {
      setErrorMsg("Please select the validity period.");
      return;
    }

    const fromDate = new Date(validFrom);
    const toDate = new Date(validTo);
    if (toDate <= fromDate) {
      setErrorMsg("Valid Until must be after Valid From.");
      return;
    }

    setIssuingPass(true);
    try {
      const res = await fetch("/api/estate/passes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName: visitorName.trim(),
          phone: visitorPhone.trim() || undefined,
          purpose,
          validFrom: fromDate.toISOString(),
          validTo: toDate.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Create pass error:", data);
        setErrorMsg(data.error?.message || "Could not create visitor pass.");
        return;
      }

      setNewlyCreatedPass(data.pass);
      setVisitorName("");
      setVisitorPhone("");
      setPurpose("personal");
      resetValidityWindow(4);
      await loadAllData(true);
    } catch (err) {
      console.error("Issue pass request error:", err);
      setErrorMsg("Something went wrong while creating the pass.");
    } finally {
      setIssuingPass(false);
    }
  }

  async function handleRevokePass(passId: number) {
    clearMessages();
    setRevokingPass(true);
    try {
      const res = await fetch(`/api/estate/passes/${passId}/revoke`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Revoke pass error:", data);
        setErrorMsg(data.error?.message || "Could not revoke visitor pass.");
        return;
      }
      setSuccessMsg(data.message || "Visitor pass revoked.");
      setSelectedPass(data.pass);
      await loadAllData(true);
    } catch (err) {
      console.error("Revoke pass request error:", err);
      setErrorMsg("Something went wrong while revoking the pass.");
    } finally {
      setRevokingPass(false);
    }
  }

  async function handleGenerateExitCode(passId: number) {
    clearMessages();
    setGeneratingExitCode(true);
    try {
      const res = await fetch(`/api/estate/passes/${passId}/exit-code`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Exit code error:", data);
        setErrorMsg(data.error?.message || "Could not generate exit code.");
        return;
      }
      setSuccessMsg(data.message || "Exit code generated!");
      setSelectedPass(data.pass);
      await loadAllData(true);
    } catch (err) {
      console.error("Exit code request error:", err);
      setErrorMsg("Something went wrong while generating the exit code.");
    } finally {
      setGeneratingExitCode(false);
    }
  }

  async function handleRequestHouseChange(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!moveHouseId) {
      setErrorMsg("Please select the new street and house number.");
      return;
    }

    setSubmittingMove(true);
    try {
      const res = await fetch("/api/estate/resident/house-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseId: Number(moveHouseId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("House change error:", data);
        setErrorMsg(data.error?.message || "Could not request house change.");
        return;
      }
      setSuccessMsg(data.message || "House change request submitted.");
      setMoveStreetId("");
      setMoveHouseId("");
      await loadAllData(true);
    } catch (err) {
      console.error("House change request error:", err);
      setErrorMsg("Something went wrong.");
    } finally {
      setSubmittingMove(false);
    }
  }

  async function handleCancelHouseChange() {
    clearMessages();
    setSubmittingMove(true);
    try {
      const res = await fetch("/api/estate/resident/house-change", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "House change request cancelled.");
        await loadAllData(true);
      }
    } catch (err) {
      console.error("Cancel house change error:", err);
    } finally {
      setSubmittingMove(false);
    }
  }

  function buildShareText(pass: VisitorPassItem) {
    const lines = [
      `Hello ${pass.visitorName},`,
      `Your Visitorly entry code for ${estateName} is: *${pass.code}*`,
      houseInfo ? `Destination: ${houseInfo.street}, House ${houseInfo.number}` : "",
      estateAddress
        ? `Address: ${estateAddress}${estateCity ? `, ${estateCity}` : ""}`
        : "",
      `Valid until: ${formatDateTime(pass.validTo)}`,
      `Show this 6-digit code to security at the estate gate.`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function handleSharePass(pass: VisitorPassItem) {
    const text = buildShareText(pass);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Visitor Code for ${estateName}`,
          text,
        });
        return;
      } catch {}
    }
    await navigator.clipboard?.writeText(text);
    setSuccessMsg("Pass details copied to clipboard!");
  }

  async function handleCopyCode(code: string, label = "Visitor code") {
    await navigator.clipboard?.writeText(code);
    setSuccessMsg(`${label} (${code}) copied to clipboard!`);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();

    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || "Could not change your password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessMsg(data.message || "Your password has been changed.");
    } catch {
      setErrorMsg("Network error while changing password.");
    } finally {
      setChangingPassword(false);
    }
  }

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = userFullName.split(" ")[0] || "Resident";

  // Filtered passes for Passes tab
  const filteredPasses = passes.filter((p) => {
    if (passFilter !== "all" && p.effectiveStatus !== passFilter) {
      return false;
    }
    if (passSearch.trim()) {
      const q = passSearch.toLowerCase();
      return (
        p.visitorName.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Loading Resident Portal...</p>
        </div>
      </div>
    );
  }

  const userInitials = userFullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("") || "R";

  const tabTitles: Record<TabType, string> = {
    home: "Overview",
    passes: "Visitor Codes",
    issue: "Create Visitor Pass",
    notices: "Estate Notices",
    profile: "Profile",
  };

  function navigateTab(tab: TabType) {
    clearMessages();
    setNewlyCreatedPass(null);
    setActiveTab(tab);
  }

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

        {/* Residence Context & Primary CTA */}
        <div className="p-4 space-y-3 border-b border-slate-100">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <p className="truncate text-xs font-semibold text-slate-900">
                {estateName}
              </p>
            </div>
            {houseInfo && (
              <p className="mt-1 truncate pl-4 text-xs text-slate-500">
                House {houseInfo.number}, {houseInfo.street}
              </p>
            )}
          </div>

          <Button
            className="w-full justify-center"
            onClick={() => navigateTab("issue")}
          >
            <Plus className="h-4 w-4" />
            New Visitor Pass
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Resident Menu
            </p>
            <nav className="mt-2 space-y-1">
              {[
                { id: "home", label: "Overview", icon: Home },
                {
                  id: "passes",
                  label: "Visitor Codes",
                  icon: QrCode,
                  badge: stats.activePasses + stats.insideNow,
                },
                {
                  id: "notices",
                  label: "Estate Notices",
                  icon: Bell,
                  badge: notices.length,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTab(item.id as TabType)}
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
              Account
            </p>
            <nav className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => navigateTab("profile")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === "profile"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <User
                  className={`h-4 w-4 ${
                    activeTab === "profile" ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                Profile
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom User Footer */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2 rounded-xl p-2 hover:bg-slate-50 transition-colors">
            <button
              type="button"
              onClick={() => navigateTab("profile")}
              className="flex min-w-0 items-center gap-2.5 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                {userInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {userFullName}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {userEmail || "Resident"}
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
            {/* Mobile Brand */}
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
                {estateName}
                {houseInfo ? ` • House ${houseInfo.number}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="lg:hidden"
              onClick={() => navigateTab("issue")}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Pass</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAllData(true)}
              isLoading={refreshing}
              title="Refresh data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
              className="lg:hidden"
            >
              <LogOut className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
          {/* Global Feedback */}
          {errorMsg && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                className="rounded-md p-1 text-red-500 hover:bg-red-100 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg("")}
                className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Clean Welcome Header */}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    {greeting}, {firstName}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage guest passes and gate activity for{" "}
                    {houseInfo
                      ? `House ${houseInfo.number}, ${houseInfo.street}`
                      : estateName}
                    .
                  </p>
                </div>
              </div>

              {/* Separate 4-Column Metric Cards */}
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => {
                    setPassFilter("active");
                    setActiveTab("passes");
                  }}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-emerald-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Expected Guests
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                      <QrCode className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {stats.activePasses}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Active entry codes</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPassFilter("checked_in");
                    setActiveTab("passes");
                  }}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-amber-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Inside Estate Now
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {stats.insideNow}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Checked in at gate</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPassFilter("all");
                    setActiveTab("passes");
                  }}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-indigo-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Total Passes
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <History className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {stats.totalPasses}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">All-time issued</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("notices")}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-indigo-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Estate Notices
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {notices.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Announcements</p>
                </button>
              </div>

              {/* Recent Visitor Passes (Full Width) */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">
                          Recent Visitor Passes
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Select a row to manage or generate an exit code.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPassFilter("all");
                          setActiveTab("passes");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        View all <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {passes.length === 0 ? (
                      <div className="p-10 text-center space-y-3">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <QrCode className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            No visitor codes yet
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Create a 6-character pass when expecting a guest or delivery.
                          </p>
                        </div>
                        <Button size="sm" onClick={() => navigateTab("issue")}>
                          <Plus className="h-4 w-4" />
                          Create First Code
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-5 py-3">Visitor</th>
                              <th className="px-4 py-3">Code</th>
                              <th className="hidden sm:table-cell px-4 py-3">Valid Until</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {passes.slice(0, 6).map((pass) => (
                              <tr
                                key={pass.id}
                                onClick={() => {
                                  clearMessages();
                                  setSelectedPass(pass);
                                }}
                                className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                              >
                                <td className="px-5 py-3.5">
                                  <p className="font-medium text-slate-900">
                                    {pass.visitorName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {purposeLabels[pass.purpose] || pass.purpose}
                                  </p>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
                                    {pass.code}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyCode(pass.code, "Visitor code");
                                      }}
                                      title="Copy code"
                                      className="text-slate-400 hover:text-indigo-600"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </span>
                                </td>
                                <td className="hidden sm:table-cell px-4 py-3.5 text-xs text-slate-500">
                                  {formatDateTime(pass.validTo)}
                                </td>
                                <td className="px-4 py-3.5">
                                  <Badge
                                    variant={
                                      statusVariant[pass.effectiveStatus] ||
                                      "secondary"
                                    }
                                  >
                                    {pass.effectiveStatus === "checked_in"
                                      ? "INSIDE"
                                      : pass.effectiveStatus === "checked_out"
                                      ? "LEFT"
                                      : pass.effectiveStatus.toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  {pass.effectiveStatus === "checked_in" ? (
                                    <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                      Exit Code
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-slate-400 hover:text-slate-700">
                                      Details
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
            </div>
          )}

          {/* ==================== TAB 2: PASSES ==================== */}
          {activeTab === "passes" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    All Visitor Codes ({passes.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Search, filter, copy, or revoke any pass issued for your residence.
                  </p>
                </div>
                <Button size="sm" onClick={() => navigateTab("issue")}>
                  <Plus className="h-4 w-4" />
                  New Pass
                </Button>
              </div>

              <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by visitor name, phone, or 6-character code..."
                    value={passSearch}
                    onChange={(e) => setPassSearch(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "checked_in", label: "Inside" },
                    { id: "checked_out", label: "Left" },
                    { id: "expired", label: "Expired" },
                    { id: "revoked", label: "Revoked" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPassFilter(f.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        passFilter === f.id
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPasses.length === 0 ? (
                <div className="p-12 text-center">
                  <QrCode className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-900">
                    No matching visitor codes
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try another filter or create a new visitor pass.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Visitor</th>
                        <th className="px-4 py-3">Entry Code</th>
                        <th className="hidden md:table-cell px-4 py-3">Validity Window</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPasses.map((pass) => (
                        <tr
                          key={pass.id}
                          onClick={() => {
                            clearMessages();
                            setSelectedPass(pass);
                          }}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-900">
                              {pass.visitorName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {purposeLabels[pass.purpose] || pass.purpose}
                              {pass.phone ? ` • ${pass.phone}` : ""}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-white">
                              {pass.code}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyCode(pass.code, "Visitor code");
                                }}
                                title="Copy code"
                                className="text-slate-300 hover:text-white"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5 text-xs text-slate-500">
                            {formatDateTime(pass.validFrom)} –{" "}
                            {formatDateTime(pass.validTo)}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant={
                                statusVariant[pass.effectiveStatus] || "secondary"
                              }
                            >
                              {pass.effectiveStatus === "checked_in"
                                ? "INSIDE NOW"
                                : pass.effectiveStatus === "checked_out"
                                ? "LEFT"
                                : pass.effectiveStatus.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {pass.effectiveStatus === "checked_in" ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Exit Code Ready
                              </span>
                            ) : (
                              <Button size="sm" variant="outline">
                                Manage
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 3: CREATE PASS ==================== */}
          {activeTab === "issue" && (
            <div className="mx-auto max-w-lg">
              {newlyCreatedPass ? (
                <Card className="border-slate-200 shadow-2xs overflow-hidden">
                  <CardContent className="pt-8 pb-6 text-center space-y-6">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-950">
                        Visitor Code Ready
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Share this 6-character code with{" "}
                        <strong className="text-slate-900">
                          {newlyCreatedPass.visitorName}
                        </strong>
                        .
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-6 text-white space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
                        Gate Entry Code
                      </p>
                      <p className="text-4xl font-mono font-bold tracking-[0.25em]">
                        {newlyCreatedPass.code}
                      </p>
                      <p className="text-xs text-slate-400 pt-1">
                        Valid until {formatDateTime(newlyCreatedPass.validTo)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => handleSharePass(newlyCreatedPass)}
                      >
                        <Share2 className="h-4 w-4" />
                        Share with Visitor
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          handleCopyCode(newlyCreatedPass.code, "Visitor code")
                        }
                      >
                        <Copy className="h-4 w-4" />
                        Copy Code ({newlyCreatedPass.code})
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setNewlyCreatedPass(null)}
                      >
                        Create Another Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-slate-200 shadow-2xs">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-semibold text-slate-950 flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-indigo-600" />
                      New Visitor Pass
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Single-use gate code for{" "}
                      {houseInfo
                        ? `${houseInfo.street}, House ${houseInfo.number}`
                        : estateName}
                      .
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <form onSubmit={handleIssuePass} className="space-y-4">
                      <Input
                        label="Visitor Full Name"
                        placeholder="e.g. Chioma Adeyemi"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        required
                      />

                      <Input
                        label="Visitor Phone Number (optional)"
                        type="tel"
                        placeholder="e.g. +234 803 123 4567"
                        value={visitorPhone}
                        onChange={(e) => setVisitorPhone(e.target.value)}
                      />

                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">
                          Purpose of Visit
                        </label>
                        <select
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {Object.entries(purposeLabels).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-500">
                          Quick Duration Presets
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "2 Hours", hours: 2 },
                            { label: "4 Hours", hours: 4 },
                            { label: "8 Hours", hours: 8 },
                            { label: "24 Hours", hours: 24 },
                          ].map((preset) => (
                            <button
                              key={preset.hours}
                              type="button"
                              onClick={() => resetValidityWindow(preset.hours)}
                              className="rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Valid From"
                          type="datetime-local"
                          value={validFrom}
                          onChange={(e) => setValidFrom(e.target.value)}
                          required
                        />
                        <Input
                          label="Valid Until"
                          type="datetime-local"
                          value={validTo}
                          onChange={(e) => setValidTo(e.target.value)}
                          required
                        />
                      </div>

                      <div className="pt-1">
                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          isLoading={issuingPass}
                        >
                          <QrCode className="h-4 w-4" />
                          Generate Visitor Code
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ==================== TAB 4: ESTATE NOTICES ==================== */}
          {activeTab === "notices" && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950">
                    Estate Announcements
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Official updates and notices from {estateName} administration.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                  <Bell className="h-3.5 w-3.5 text-indigo-600" />
                  {notices.length} {notices.length === 1 ? "Notice" : "Notices"}
                </span>
              </div>

              {/* Full-width Notice Feed */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                {notices.length === 0 ? (
                  <div className="p-12 text-center space-y-2.5">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      No estate notices yet
                    </p>
                    <p className="text-xs text-slate-500">
                      Announcements posted by your estate administrator will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notices.map((n, index) => (
                      <article
                        key={n.id}
                        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-4 hover:bg-slate-50/50 transition-colors"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            index === 0
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Bell className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-950">
                                {n.title}
                              </h3>
                              {index === 0 && (
                                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  Latest
                                </span>
                              )}
                            </div>
                            <time className="text-xs text-slate-400">
                              {formatDateTime(n.createdAt)}
                            </time>
                          </div>

                          <p className="text-sm leading-6 text-slate-600 whitespace-pre-line">
                            {n.message}
                          </p>

                          <div className="pt-1 flex items-center gap-2 text-xs text-slate-400">
                            <span>Posted by</span>
                            <span className="font-medium text-slate-600">
                              {n.authorName}
                            </span>
                            <span>&middot;</span>
                            <span>Estate Admin</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 5: PROFILE & HOUSE ==================== */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-7">
                <Card className="rounded-lg border-slate-200 shadow-2xs">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                        {userInitials}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-slate-950">
                          {userFullName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Verified resident at {estateName}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 text-sm">
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-slate-500">Email</span>
                        <span className="font-medium text-slate-900">{userEmail}</span>
                      </div>
                      {userPhone && (
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-slate-500">Phone</span>
                          <span className="font-medium text-slate-900">{userPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-slate-500">Estate</span>
                        <span className="font-medium text-slate-900">{estateName}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-slate-500">Assigned Residence</span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700">
                          <MapPin className="h-3.5 w-3.5" />
                          {houseInfo
                            ? `${houseInfo.street}, House ${houseInfo.number}`
                            : "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {hasMultipleEstates && (
                        <Link href="/select-estate">
                          <Button variant="outline" size="sm">
                            <ArrowRightLeft className="h-4 w-4" />
                            Switch Estate
                          </Button>
                        </Link>
                      )}
                      <Button variant="danger" size="sm" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right 5 cols: Inline Change Password */}
              <div className="lg:col-span-5">
                <Card className="rounded-lg border-slate-200 shadow-2xs">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-semibold text-slate-950 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-indigo-600" />
                      Change Password
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Update your password without leaving your dashboard.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="profile-current-password"
                          className="block text-xs font-medium text-slate-700"
                        >
                          Current Password
                        </label>
                        <div className="relative">
                          <Input
                            id="profile-current-password"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            aria-label={
                              showCurrentPassword
                                ? "Hide current password"
                                : "Show current password"
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="profile-new-password"
                          className="block text-xs font-medium text-slate-700"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <Input
                            id="profile-new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="At least 8 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            aria-label={
                              showNewPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Input
                        label="Confirm New Password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        isLoading={changingPassword}
                      >
                        Update Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODAL: VISITOR PASS DETAILS / EXIT CODE / REVOKE ==================== */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-950">
                  Visitor Entry Pass
                </h3>
                <Badge
                  variant={
                    statusVariant[selectedPass.effectiveStatus] || "secondary"
                  }
                >
                  {selectedPass.effectiveStatus === "checked_in"
                    ? "INSIDE NOW"
                    : selectedPass.effectiveStatus === "checked_out"
                    ? "LEFT"
                    : selectedPass.effectiveStatus.toUpperCase()}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedPass.status === "checked_in" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-emerald-900">
                    Visitor Exit Authorization
                  </p>
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                {selectedPass.exitCode &&
                selectedPass.exitCodeValidTo &&
                new Date(selectedPass.exitCodeValidTo) > new Date() ? (
                  <div className="space-y-3 text-center">
                    <div className="rounded-xl bg-white border border-emerald-200 p-3">
                      <p className="text-xs text-slate-500">15-Minute Exit Code</p>
                      <p className="text-3xl font-mono font-bold tracking-widest text-emerald-700 mt-1">
                        {selectedPass.exitCode}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Expires {formatDateTime(selectedPass.exitCodeValidTo)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1"
                        onClick={() =>
                          handleCopyCode(selectedPass.exitCode!, "Exit code")
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Exit Code
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={generatingExitCode}
                        onClick={() => handleGenerateExitCode(selectedPass.id)}
                      >
                        New Code
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs text-emerald-800">
                      {selectedPass.visitorName} is currently inside the estate. Generate a 15-minute exit code when they are ready to leave.
                    </p>
                    <Button
                      size="sm"
                      variant="success"
                      className="w-full"
                      isLoading={generatingExitCode}
                      onClick={() => handleGenerateExitCode(selectedPass.id)}
                    >
                      Generate Exit Code
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-slate-950 p-5 text-center text-white space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
                Gate Entry Code
              </p>
              <p className="text-3xl font-mono font-bold tracking-[0.25em]">
                {selectedPass.code}
              </p>
              <p className="text-xs text-slate-400">
                Show or read this code to security at the gate
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-slate-500">Visitor</span>
                <span className="font-semibold text-slate-900">
                  {selectedPass.visitorName}
                </span>
              </div>
              {selectedPass.phone && (
                <div className="flex justify-between px-3.5 py-2.5">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-semibold text-slate-900">
                    {selectedPass.phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-slate-500">Purpose</span>
                <span className="font-semibold text-slate-900">
                  {purposeLabels[selectedPass.purpose] || selectedPass.purpose}
                </span>
              </div>
              {selectedPass.house && (
                <div className="flex justify-between px-3.5 py-2.5">
                  <span className="text-slate-500">Destination</span>
                  <span className="font-semibold text-slate-900">
                    {selectedPass.house}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-slate-500">Valid From</span>
                <span className="font-semibold text-slate-900">
                  {formatDateTime(selectedPass.validFrom)}
                </span>
              </div>
              <div className="flex justify-between px-3.5 py-2.5">
                <span className="text-slate-500">Valid Until</span>
                <span className="font-semibold text-slate-900">
                  {formatDateTime(selectedPass.validTo)}
                </span>
              </div>
              {selectedPass.checkedInAt && (
                <div className="flex justify-between px-3.5 py-2.5">
                  <span className="text-slate-500">Checked In</span>
                  <span className="font-semibold text-emerald-700">
                    {formatDateTime(selectedPass.checkedInAt)}
                    {selectedPass.admittedByName
                      ? ` (${selectedPass.admittedByName})`
                      : ""}
                  </span>
                </div>
              )}
              {selectedPass.checkedOutAt && (
                <div className="flex justify-between px-3.5 py-2.5">
                  <span className="text-slate-500">Checked Out</span>
                  <span className="font-semibold text-slate-700">
                    {formatDateTime(selectedPass.checkedOutAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {selectedPass.effectiveStatus === "active" && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => handleSharePass(selectedPass)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share with Visitor
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      handleCopyCode(selectedPass.code, "Visitor code")
                    }
                  >
                    <Copy className="h-4 w-4" />
                    Copy Code ({selectedPass.code})
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full"
                    isLoading={revokingPass}
                    onClick={() => handleRevokePass(selectedPass.id)}
                  >
                    <Ban className="h-4 w-4" />
                    Revoke Code
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "passes", icon: QrCode, label: "Codes" },
            { id: "issue", icon: Plus, label: "Create" },
            { id: "notices", icon: Bell, label: "Notices" },
            { id: "profile", icon: User, label: "Profile" },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTab(item.id as TabType)}
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
    </div>
  );
}
