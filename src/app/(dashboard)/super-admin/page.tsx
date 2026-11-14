"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PWAInstall from "@/components/pwa-install";
import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

type TabId =
  | "overview"
  | "estates"
  | "admins"
  | "residents"
  | "security"
  | "logs"
  | "passes"
  | "notices";

type EstateDetailTab = "admins" | "residents" | "security" | "passes" | "logs" | "notices";

interface UserInfo {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  isSuperAdmin?: boolean;
}

interface PlatformStats {
  totalEstates: number;
  activeEstates: number;
  pendingEstates: number;
  suspendedEstates: number;
  totalUsers: number;
  totalResidents: number;
  pendingResidents: number;
  totalAdmins: number;
  totalSecurity: number;
  totalPasses: number;
  activePasses: number;
  insideNowPasses: number;
  totalGateLogs: number;
  gateLogsToday: number;
  deniedToday: number;
  totalNotices: number;
}

interface EstateSummary {
  id: number;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  totalHouses: number | null;
  status: string;
  activatedAt?: string | null;
  activeUntil?: string | null;
  createdAt: string;
  createdBy: { id: number; fullName: string; email: string; phone: string | null };
  admins: Array<{
    membershipId: number;
    status: string;
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    lastLoginAt: string | null;
  }>;
  counts: {
    residentsActive: number;
    residentsPending: number;
    securityActive: number;
    adminsCount: number;
    insideNow: number;
    streets: number;
    houses: number;
    passes: number;
    gateLogs: number;
    notices: number;
  };
}

interface AdminRow {
  membershipId: number;
  status: string;
  createdAt: string;
  user: { id: number; fullName: string; email: string; phone: string | null; status: string; lastLoginAt: string | null };
  organization: { id: number; name: string; city: string | null; status: string; activatedAt?: string | null; activeUntil?: string | null };
}

interface ResidentRow {
  membershipId: number;
  status: string;
  createdAt: string;
  user: { id: number; fullName: string; email: string; phone: string | null; status: string; lastLoginAt: string | null };
  organization: { id: number; name: string; status: string };
  house: { id: number; number: string; street: string } | null;
}

interface SecurityRow {
  membershipId: number;
  status: string;
  assignedGate: string | null;
  shift: string | null;
  createdAt: string;
  user: { id: number; fullName: string; email: string; phone: string | null; status: string; lastLoginAt: string | null };
  organization: { id: number; name: string; status: string };
}

interface PassRow {
  id: number;
  code: string;
  visitorName: string;
  phone: string | null;
  purpose: string;
  status: string;
  validFrom: string;
  validTo: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  organization: { id: number; name: string };
  house: { number: string; street: string } | null;
  createdBy: { id: number; fullName: string; email: string };
  admittedBy: { id: number; fullName: string } | null;
}

interface GateLogRow {
  id: number;
  code: string;
  action: "entry" | "exit";
  result: "success" | "denied";
  reason: string | null;
  createdAt: string;
  organization: { id: number; name: string };
  officer: { id: number; fullName: string };
  visitorName: string | null;
  purpose: string | null;
  house: { number: string; street: string } | null;
}

interface NoticeRow {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  organization: { id: number; name: string };
  createdBy: { id: number; fullName: string };
}

interface EstateDetail {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  totalHouses: number | null;
  status: string;
  activatedAt?: string | null;
  activeUntil?: string | null;
  createdAt: string;
  createdBy: { id: number; fullName: string; email: string; phone: string | null };
  streets: Array<{ id: number; name: string; housesCount: number }>;
  admins: Array<{
    membershipId: number;
    status: string;
    createdAt: string;
    user: { id: number; fullName: string; email: string; phone: string | null; status: string; lastLoginAt: string | null };
  }>;
  residents: Array<{
    membershipId: number;
    status: string;
    createdAt: string;
    user: { id: number; fullName: string; email: string; phone: string | null; status: string; lastLoginAt: string | null };
    house: { id: number; number: string; street: string } | null;
  }>;
  securityStaff: Array<{
    membershipId: number;
    status: string;
    assignedGate: string | null;
    shift: string | null;
    createdAt: string;
    user: { id: number; fullName: string; email: string; phone: string | null; status: string; lastLoginAt: string | null };
  }>;
  passes: Array<Omit<PassRow, "organization">>;
  gateLogs: Array<Omit<GateLogRow, "organization" | "purpose">>;
  notices: Array<{ id: number; title: string; message: string; createdAt: string; createdBy: { id: number; fullName: string } }>;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
  rejected: "bg-slate-100 text-slate-600 border-slate-200",
  checked_in: "bg-amber-50 text-amber-700 border-amber-200",
  checked_out: "bg-slate-100 text-slate-600 border-slate-200",
  revoked: "bg-rose-50 text-rose-700 border-rose-200",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedEstateFilter, setSelectedEstateFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [estates, setEstates] = useState<EstateSummary[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [securityStaff, setSecurityStaff] = useState<SecurityRow[]>([]);
  const [recentPasses, setRecentPasses] = useState<PassRow[]>([]);
  const [recentGateLogs, setRecentGateLogs] = useState<GateLogRow[]>([]);
  const [recentNotices, setRecentNotices] = useState<NoticeRow[]>([]);

  // Estate Drill-Down Modal
  const [detailEstate, setDetailEstate] = useState<EstateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<EstateDetailTab>("residents");
  const [detailSearch, setDetailSearch] = useState("");

  // Create Estate Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingEstate, setCreatingEstate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newEstateName, setNewEstateName] = useState("");
  const [newEstateCity, setNewEstateCity] = useState("");
  const [newEstateAddress, setNewEstateAddress] = useState("");
  const [newEstateHouses, setNewEstateHouses] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Timed Activation Modal
  const [activateTarget, setActivateTarget] = useState<{ id: number; name: string; adminName?: string } | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [durationValue, setDurationValue] = useState<string>("1");
  const [durationUnit, setDurationUnit] = useState<"hours" | "days" | "weeks" | "months" | "years">("months");
  const [activating, setActivating] = useState(false);

  const previewDeactivationDate = useMemo(() => {
    if (isUnlimited) return null;
    const val = Number(durationValue);
    if (!Number.isInteger(val) || val <= 0) return null;
    const d = new Date();
    if (durationUnit === "hours") d.setHours(d.getHours() + val);
    else if (durationUnit === "days") d.setDate(d.getDate() + val);
    else if (durationUnit === "weeks") d.setDate(d.getDate() + val * 7);
    else if (durationUnit === "months") d.setMonth(d.getMonth() + val);
    else if (durationUnit === "years") d.setFullYear(d.getFullYear() + val);
    return d;
  }, [isUnlimited, durationValue, durationUnit]);

  function openActivateModal(estate: { id: number; name: string; adminName?: string }) {
    setActivateTarget(estate);
    setIsUnlimited(false);
    setDurationValue("1");
    setDurationUnit("months");
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const fetchOverview = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      try {
        const qs = selectedEstateFilter ? `?estateId=${encodeURIComponent(selectedEstateFilter)}` : "";
        const res = await fetch(`/api/super-admin/overview${qs}`, { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error?.message || "Failed to load platform overview.");
          return;
        }
        setStats(data.stats);
        setEstates(data.estates || []);
        setAdmins(data.admins || []);
        setResidents(data.residents || []);
        setSecurityStaff(data.securityStaff || []);
        setRecentPasses(data.recentPasses || []);
        setRecentGateLogs(data.recentGateLogs || []);
        setRecentNotices(data.recentNotices || []);
        setError("");
      } catch {
        setError("Network error loading platform data.");
      } finally {
        setRefreshing(false);
      }
    },
    [router, selectedEstateFilter]
  );

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const meData = await meRes.json();
        if (!meData.user?.isSuperAdmin) {
          router.push("/dashboard");
          return;
        }
        if (active) setUser(meData.user);
        await fetchOverview(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [fetchOverview, router]);

  async function openEstateDetail(estateId: number) {
    setDetailLoading(true);
    setDetailTab("residents");
    setDetailSearch("");
    try {
      const res = await fetch(`/api/super-admin/estates/${estateId}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.estate) {
        setDetailEstate(data.estate);
      } else {
        showToast(data.error?.message || "Could not load estate details.");
      }
    } catch {
      showToast("Network error loading estate details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleEstateStatus(estateId: number, status: "active" | "suspended" | "rejected") {
    setActionBusyId(`estate-${estateId}`);
    try {
      const res = await fetch(`/api/super-admin/estates/${estateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(`Estate marked as ${status}.`);
        await fetchOverview(true);
        if (detailEstate?.id === estateId) {
          await openEstateDetail(estateId);
        }
      }
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleConfirmActivate() {
    if (!activateTarget) return;
    setActivating(true);
    try {
      const payload: Record<string, unknown> = { status: "active" };
      if (isUnlimited) {
        payload.unlimited = true;
      } else {
        const val = Number(durationValue);
        if (!Number.isInteger(val) || val <= 0) return;
        payload.durationValue = val;
        payload.durationUnit = durationUnit;
      }

      const res = await fetch(`/api/super-admin/estates/${activateTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const untilMsg = previewDeactivationDate
          ? `until ${previewDeactivationDate.toLocaleString()}`
          : "with no expiration";
        showToast(`${activateTarget.name} activated ${untilMsg}.`);
        const targetId = activateTarget.id;
        setActivateTarget(null);
        await fetchOverview(true);
        if (detailEstate?.id === targetId) {
          await openEstateDetail(targetId);
        }
      }
    } finally {
      setActivating(false);
    }
  }

  async function handleMembershipStatus(membershipId: number, status: "active" | "suspended" | "rejected") {
    setActionBusyId(`mem-${membershipId}`);
    try {
      const res = await fetch(`/api/super-admin/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(`Member status updated to ${status}.`);
        await fetchOverview(true);
        if (detailEstate) {
          await openEstateDetail(detailEstate.id);
        }
      }
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleCreateEstate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreatingEstate(true);
    try {
      const res = await fetch("/api/super-admin/estates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEstateName,
          city: newEstateCity,
          address: newEstateAddress,
          totalHouses: newEstateHouses ? Number(newEstateHouses) : undefined,
          status: "active",
          adminName: newAdminName || undefined,
          adminEmail: newAdminEmail || undefined,
          adminPhone: newAdminPhone || undefined,
          adminPassword: newAdminPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error?.message || "Failed to create estate.");
        return;
      }
      setShowCreateModal(false);
      setNewEstateName("");
      setNewEstateCity("");
      setNewEstateAddress("");
      setNewEstateHouses("");
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPhone("");
      setNewAdminPassword("");
      showToast("Estate created successfully.");
      await fetchOverview(true);
    } catch {
      setCreateError("Network error creating estate.");
    } finally {
      setCreatingEstate(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const q = searchQuery.trim().toLowerCase();

  const filteredEstates = useMemo(() => {
    return estates.filter((e) => {
      if (selectedEstateFilter && String(e.id) !== selectedEstateFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.city || "").toLowerCase().includes(q) ||
        (e.address || "").toLowerCase().includes(q) ||
        e.admins.some((a) => a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
      );
    });
  }, [estates, selectedEstateFilter, q]);

  const filteredAdmins = useMemo(() => {
    if (!q) return admins;
    return admins.filter(
      (a) =>
        a.user.fullName.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        a.organization.name.toLowerCase().includes(q)
    );
  }, [admins, q]);

  const filteredResidents = useMemo(() => {
    if (!q) return residents;
    return residents.filter(
      (r) =>
        r.user.fullName.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        (r.user.phone || "").toLowerCase().includes(q) ||
        r.organization.name.toLowerCase().includes(q) ||
        (r.house ? `${r.house.street} ${r.house.number}`.toLowerCase().includes(q) : false)
    );
  }, [residents, q]);

  const filteredSecurity = useMemo(() => {
    if (!q) return securityStaff;
    return securityStaff.filter(
      (s) =>
        s.user.fullName.toLowerCase().includes(q) ||
        s.user.email.toLowerCase().includes(q) ||
        s.organization.name.toLowerCase().includes(q) ||
        (s.assignedGate || "").toLowerCase().includes(q)
    );
  }, [securityStaff, q]);

  const filteredLogs = useMemo(() => {
    if (!q) return recentGateLogs;
    return recentGateLogs.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        (l.visitorName || "").toLowerCase().includes(q) ||
        l.officer.fullName.toLowerCase().includes(q) ||
        l.organization.name.toLowerCase().includes(q)
    );
  }, [recentGateLogs, q]);

  const filteredPasses = useMemo(() => {
    if (!q) return recentPasses;
    return recentPasses.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.visitorName.toLowerCase().includes(q) ||
        p.createdBy.fullName.toLowerCase().includes(q) ||
        p.organization.name.toLowerCase().includes(q)
    );
  }, [recentPasses, q]);

  const pendingEstates = useMemo(() => estates.filter((e) => e.status === "pending"), [estates]);

  const platformNav: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "estates", label: "Estates", icon: Building2, badge: stats?.totalEstates },
    { id: "admins", label: "Estate Admins", icon: ShieldCheck, badge: admins.length },
    { id: "residents", label: "All Residents", icon: Users, badge: stats?.totalResidents },
    { id: "security", label: "Security Staff", icon: Shield, badge: stats?.totalSecurity },
  ];

  const activityNav: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: "logs", label: "Gate Logs", icon: Activity, badge: stats?.gateLogsToday },
    { id: "passes", label: "Visitor Passes", icon: QrCode, badge: stats?.insideNowPasses },
    { id: "notices", label: "Estate Notices", icon: Bell, badge: recentNotices.length },
  ];

  const tabTitles: Record<TabId, string> = {
    overview: "Platform Overview",
    estates: "Estates Directory",
    admins: "Estate Administrators",
    residents: "All Residents",
    security: "Security Officers",
    logs: "Platform Gate Logs",
    passes: "All Visitor Passes",
    notices: "Estate Notices",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading Super Admin console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Fixed Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-950">
            Visitorly<span className="text-indigo-600">.</span>
          </span>
        </div>

        {/* Live Context Box */}
        <div className="px-4 pt-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Super Admin
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">Platform Owner</p>
            <p className="text-xs text-slate-500 truncate">
              {stats?.totalEstates ?? 0} estates · {stats?.totalUsers ?? 0} users
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="px-4 pt-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="w-full justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-10 text-sm font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Estate
          </Button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Platform
            </p>
            <div className="space-y-1">
              {platformNav.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                      {item.label}
                    </span>
                    {typeof item.badge === "number" && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Live Activity
            </p>
            <div className="space-y-1">
              {activityNav.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                      {item.label}
                    </span>
                    {typeof item.badge === "number" && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Bottom User Footer */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              {user?.fullName?.charAt(0).toUpperCase() || "S"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h1 className="text-lg font-semibold text-slate-900 truncate">{tabTitles[activeTab]}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedEstateFilter}
              onChange={(e) => setSelectedEstateFilter(e.target.value)}
              aria-label="Filter by estate"
              className="hidden sm:block h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Estates ({estates.length})</option>
              {estates.map((est) => (
                <option key={est.id} value={String(est.id)}>
                  {est.name}
                </option>
              ))}
            </select>

            <PWAInstall compact />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchOverview(true)}
              disabled={refreshing}
              className="h-9 gap-1.5 text-xs border-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="lg:hidden h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Estate
            </Button>

            <button
              onClick={handleLogout}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Nav Strip */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {[...platformNav, ...activityNav].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {toast && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {toast}
              </span>
              <button onClick={() => setToast("")} className="text-emerald-600 hover:text-emerald-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Search bar for list tabs */}
          {activeTab !== "overview" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${tabTitles[activeTab].toLowerCase()}...`}
                  className="pl-9 h-10 bg-white border-slate-200 rounded-lg text-sm"
                />
              </div>
              <select
                value={selectedEstateFilter}
                onChange={(e) => setSelectedEstateFilter(e.target.value)}
                className="sm:hidden h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="">All Estates</option>
                {estates.map((est) => (
                  <option key={est.id} value={String(est.id)}>
                    {est.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <>
              {/* Pending Estates Alert */}
              {pendingEstates.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                      <Clock className="h-4 w-4 text-amber-600" />
                      {pendingEstates.length} Estate{pendingEstates.length > 1 ? "s" : ""} Awaiting Platform Approval
                    </div>
                  </div>
                  <div className="space-y-2">
                    {pendingEstates.map((pe) => (
                      <div
                        key={pe.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-white border border-amber-200 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{pe.name}</p>
                          <p className="text-xs text-slate-500">
                            {pe.city || pe.address || "No location"} · Created by {pe.createdBy.fullName} ({pe.createdBy.email})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              openActivateModal({
                                id: pe.id,
                                name: pe.name,
                                adminName: pe.admins[0]?.fullName || pe.createdBy.fullName,
                              })
                            }
                            disabled={actionBusyId === `estate-${pe.id}`}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            Verify &amp; Activate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEstateStatus(pe.id, "rejected")}
                            disabled={actionBusyId === `estate-${pe.id}`}
                            className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4 Separate Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estates</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <Building2 className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{stats?.totalEstates ?? 0}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {stats?.activeEstates ?? 0} active · {stats?.pendingEstates ?? 0} pending
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Residents</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                      <Users className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{stats?.totalResidents ?? 0}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {stats?.totalAdmins ?? 0} estate admins · {stats?.totalSecurity ?? 0} security
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inside Estates Now</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                      <UserCheck className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{stats?.insideNowPasses ?? 0}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {stats?.activePasses ?? 0} active passes · {stats?.totalPasses ?? 0} all-time
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gate Events Today</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                      <Activity className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{stats?.gateLogsToday ?? 0}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {stats?.deniedToday ?? 0} denied today · {stats?.totalGateLogs ?? 0} total logs
                  </p>
                </div>
              </div>

              {/* Two-column Overview: Estates + Live Gate Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Estates Summary */}
                <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Estates on Platform</h2>
                      <p className="text-xs text-slate-500">Click any estate to inspect its admins, residents, and gate activity.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("estates")}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filteredEstates.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">No estates registered yet.</div>
                    ) : (
                      filteredEstates.slice(0, 8).map((est) => (
                        <div
                          key={est.id}
                          onClick={() => openEstateDetail(est.id)}
                          className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">{est.name}</p>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full border font-medium capitalize ${
                                  STATUS_BADGE[est.status] || STATUS_BADGE.active
                                }`}
                              >
                                {est.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {est.city || est.address || "Location not set"} · Admin:{" "}
                              {est.admins[0]?.fullName || est.createdBy.fullName}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0 text-right">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{est.counts.residentsActive}</p>
                              <p className="text-[11px] text-slate-500">Residents</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-amber-600">{est.counts.insideNow}</p>
                              <p className="text-[11px] text-slate-500">Inside</p>
                            </div>
                            <Eye className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Live Gate Activity Feed */}
                <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Live Gate Activity</h2>
                      <p className="text-xs text-slate-500">Latest entries, exits & denials across all estates.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("logs")}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
                    {recentGateLogs.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">No gate events recorded yet.</div>
                    ) : (
                      recentGateLogs.slice(0, 12).map((log) => (
                        <div key={log.id} className="px-5 py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  log.result === "denied"
                                    ? "bg-rose-500"
                                    : log.action === "entry"
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {log.visitorName || `Code ${log.code}`}
                              </p>
                              <span className="text-[11px] font-mono text-slate-500">{log.code}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {log.organization.name} ·{" "}
                              {log.result === "denied"
                                ? `Denied (${log.reason || "Invalid"})`
                                : log.action === "entry"
                                ? "Checked in"
                                : "Checked out"}{" "}
                              by {log.officer.fullName}
                            </p>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">{fmtDateTime(log.createdAt)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ESTATES TAB */}
          {activeTab === "estates" && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Estate</th>
                      <th className="py-3 px-4">Estate Admin</th>
                      <th className="py-3 px-4">Residents</th>
                      <th className="py-3 px-4">Security</th>
                      <th className="py-3 px-4">Passes / Inside</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredEstates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          No matching estates found.
                        </td>
                      </tr>
                    ) : (
                      filteredEstates.map((est) => (
                        <tr key={est.id} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{est.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {est.city || est.address || "No address"} · {est.counts.streets} streets · {est.counts.houses} houses
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            {est.admins.length > 0 ? (
                              <div>
                                <p className="font-medium text-slate-800">{est.admins[0].fullName}</p>
                                <p className="text-xs text-slate-500">{est.admins[0].email}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No admin assigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900">{est.counts.residentsActive}</span>
                            {est.counts.residentsPending > 0 && (
                              <span className="ml-1.5 text-xs text-amber-600">
                                ({est.counts.residentsPending} pending)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{est.counts.securityActive}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-900 font-medium">{est.counts.passes}</span>
                            <span className="text-xs text-amber-600 ml-1.5">({est.counts.insideNow} inside)</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${
                                STATUS_BADGE[est.status] || STATUS_BADGE.active
                              }`}
                            >
                              {est.status}
                            </span>
                            {est.status === "active" && (
                              <p className="text-[11px] text-slate-500 mt-1">
                                {est.activeUntil ? `Until ${fmtDateTime(est.activeUntil)}` : "No expiry"}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEstateDetail(est.id)}
                              className="h-8 text-xs border-slate-200"
                            >
                              Inspect
                            </Button>
                            {est.status === "active" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openActivateModal({
                                      id: est.id,
                                      name: est.name,
                                      adminName: est.admins[0]?.fullName,
                                    })
                                  }
                                  className="h-8 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                  Extend
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEstateStatus(est.id, "suspended")}
                                  disabled={actionBusyId === `estate-${est.id}`}
                                  className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                                >
                                  Deactivate
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() =>
                                  openActivateModal({
                                    id: est.id,
                                    name: est.name,
                                    adminName: est.admins[0]?.fullName,
                                  })
                                }
                                disabled={actionBusyId === `estate-${est.id}`}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Activate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ESTATE ADMINS TAB */}
          {activeTab === "admins" && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">Estate</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAdmins.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No estate admins found.
                        </td>
                      </tr>
                    ) : (
                      filteredAdmins.map((admin) => (
                        <tr key={admin.membershipId} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{admin.user.fullName}</p>
                            <p className="text-xs text-slate-500">{admin.user.email}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => openEstateDetail(admin.organization.id)}
                              className="font-medium text-indigo-600 hover:underline text-left"
                            >
                              {admin.organization.name}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{admin.user.phone || "—"}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">{fmtDateTime(admin.user.lastLoginAt)}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${
                                STATUS_BADGE[admin.status] || STATUS_BADGE.active
                              }`}
                            >
                              {admin.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {admin.status === "active" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMembershipStatus(admin.membershipId, "suspended")}
                                disabled={actionBusyId === `mem-${admin.membershipId}`}
                                className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleMembershipStatus(admin.membershipId, "active")}
                                disabled={actionBusyId === `mem-${admin.membershipId}`}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Activate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL RESIDENTS TAB */}
          {activeTab === "residents" && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">Estate</th>
                      <th className="py-3 px-4">House / Street</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredResidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No residents found.
                        </td>
                      </tr>
                    ) : (
                      filteredResidents.map((res) => (
                        <tr key={res.membershipId} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{res.user.fullName}</p>
                            <p className="text-xs text-slate-500">{res.user.email}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => openEstateDetail(res.organization.id)}
                              className="font-medium text-indigo-600 hover:underline text-left"
                            >
                              {res.organization.name}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {res.house ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Home className="h-3.5 w-3.5 text-slate-400" />
                                {res.house.street}, House {res.house.number}
                              </span>
                            ) : (
                              <span className="text-slate-400">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{res.user.phone || "—"}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${
                                STATUS_BADGE[res.status] || STATUS_BADGE.active
                              }`}
                            >
                              {res.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">{fmtDate(res.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECURITY STAFF TAB */}
          {activeTab === "security" && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Officer</th>
                      <th className="py-3 px-4">Estate</th>
                      <th className="py-3 px-4">Assigned Gate</th>
                      <th className="py-3 px-4">Shift</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSecurity.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No security officers found.
                        </td>
                      </tr>
                    ) : (
                      filteredSecurity.map((sec) => (
                        <tr key={sec.membershipId} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{sec.user.fullName}</p>
                            <p className="text-xs text-slate-500">{sec.user.email}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => openEstateDetail(sec.organization.id)}
                              className="font-medium text-indigo-600 hover:underline text-left"
                            >
                              {sec.organization.name}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">{sec.assignedGate || "Main Gate"}</td>
                          <td className="py-3.5 px-4 text-slate-600">{sec.shift || "—"}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">{fmtDateTime(sec.user.lastLoginAt)}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${
                                STATUS_BADGE[sec.status] || STATUS_BADGE.active
                              }`}
                            >
                              {sec.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GATE LOGS TAB */}
          {activeTab === "logs" && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Estate</th>
                      <th className="py-3 px-4">Visitor / Code</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Officer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          No gate logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {fmtDateTime(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">{log.organization.name}</td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{log.visitorName || "Unknown Visitor"}</p>
                            <p className="text-xs font-mono text-slate-500">{log.code}</p>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {log.house ? `${log.house.street}, House ${log.house.number}` : "—"}
                          </td>
                          <td className="py-3 px-4 capitalize text-slate-700">{log.action}</td>
                          <td className="py-3 px-4">
                            {log.result === "success" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                <XCircle className="h-3 w-3" />
                                Denied{log.reason ? `: ${log.reason}` : ""}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{log.officer.fullName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISITOR PASSES TAB */}
          {activeTab === "passes" && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Visitor</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Estate</th>
                      <th className="py-3 px-4">House & Host</th>
                      <th className="py-3 px-4">Valid Until</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredPasses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No visitor passes found.
                        </td>
                      </tr>
                    ) : (
                      filteredPasses.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{p.visitorName}</p>
                            <p className="text-xs text-slate-500 capitalize">{p.purpose.replace("_", " ")}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800">{p.code}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{p.organization.name}</td>
                          <td className="py-3 px-4">
                            <p className="text-xs font-medium text-slate-800">
                              {p.house ? `${p.house.street}, House ${p.house.number}` : "—"}
                            </p>
                            <p className="text-xs text-slate-500">Host: {p.createdBy.fullName}</p>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">{fmtDateTime(p.validTo)}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${
                                STATUS_BADGE[p.status] || STATUS_BADGE.active
                              }`}
                            >
                              {p.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ESTATE NOTICES TAB */}
          {activeTab === "notices" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentNotices.length === 0 ? (
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  No estate notices published yet.
                </div>
              ) : (
                recentNotices.map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        {n.organization.name}
                      </span>
                      <span className="text-xs text-slate-400">{fmtDateTime(n.createdAt)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-400 pt-1">Posted by {n.createdBy.fullName}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* ESTATE DRILL-DOWN MODAL */}
      {(detailEstate || detailLoading) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {detailLoading && !detailEstate ? (
              <div className="p-12 flex items-center justify-center gap-3 text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="text-sm font-medium">Loading estate details...</span>
              </div>
            ) : (
              detailEstate && (
                <>
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-bold text-slate-900">{detailEstate.name}</h2>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${
                            STATUS_BADGE[detailEstate.status] || STATUS_BADGE.active
                          }`}
                        >
                          {detailEstate.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {detailEstate.address || "No street address"} {detailEstate.city ? `· ${detailEstate.city}` : ""} ·{" "}
                        {detailEstate.streets.length} streets · {detailEstate.residents.length} residents ·{" "}
                        {detailEstate.securityStaff.length} security
                        {detailEstate.activeUntil && (
                          <span className="ml-2 font-medium text-indigo-600">
                            · {detailEstate.status === "active" ? "Deactivates" : "Expired"}: {fmtDateTime(detailEstate.activeUntil)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {detailEstate.status === "active" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openActivateModal({
                                id: detailEstate.id,
                                name: detailEstate.name,
                                adminName: detailEstate.admins[0]?.user.fullName,
                              })
                            }
                            className="h-8 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                          >
                            Set / Extend Timeframe
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEstateStatus(detailEstate.id, "suspended")}
                            className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            Deactivate
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            openActivateModal({
                              id: detailEstate.id,
                              name: detailEstate.name,
                              adminName: detailEstate.admins[0]?.user.fullName,
                            })
                          }
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Verify &amp; Activate
                        </Button>
                      )}
                      <button
                        onClick={() => setDetailEstate(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto">
                    {(
                      [
                        { id: "residents", label: `Residents (${detailEstate.residents.length})` },
                        { id: "admins", label: `Estate Admins (${detailEstate.admins.length})` },
                        { id: "security", label: `Security (${detailEstate.securityStaff.length})` },
                        { id: "passes", label: `Passes (${detailEstate.passes.length})` },
                        { id: "logs", label: `Gate Logs (${detailEstate.gateLogs.length})` },
                        { id: "notices", label: `Notices (${detailEstate.notices.length})` },
                      ] as Array<{ id: EstateDetailTab; label: string }>
                    ).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setDetailTab(t.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          detailTab === t.id
                            ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {detailTab === "residents" && (
                      <>
                        <div className="relative max-w-sm">
                          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <Input
                            value={detailSearch}
                            onChange={(e) => setDetailSearch(e.target.value)}
                            placeholder="Filter residents in this estate..."
                            className="pl-9 h-9 text-sm"
                          />
                        </div>
                        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                          {detailEstate.residents
                            .filter((r) => {
                              const dq = detailSearch.trim().toLowerCase();
                              if (!dq) return true;
                              return (
                                r.user.fullName.toLowerCase().includes(dq) ||
                                r.user.email.toLowerCase().includes(dq) ||
                                (r.house ? `${r.house.street} ${r.house.number}`.toLowerCase().includes(dq) : false)
                              );
                            })
                            .map((r) => (
                              <div key={r.membershipId} className="p-3.5 flex items-center justify-between gap-4 text-sm">
                                <div>
                                  <p className="font-semibold text-slate-900">{r.user.fullName}</p>
                                  <p className="text-xs text-slate-500">
                                    {r.user.email} · {r.user.phone || "No phone"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium text-slate-800">
                                    {r.house ? `${r.house.street}, House ${r.house.number}` : "No house assigned"}
                                  </p>
                                  <span
                                    className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border capitalize ${
                                      STATUS_BADGE[r.status] || STATUS_BADGE.active
                                    }`}
                                  >
                                    {r.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          {detailEstate.residents.length === 0 && (
                            <p className="p-6 text-center text-sm text-slate-500">No residents in this estate yet.</p>
                          )}
                        </div>
                      </>
                    )}

                    {detailTab === "admins" && (
                      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {detailEstate.admins.map((a) => (
                          <div key={a.membershipId} className="p-4 flex items-center justify-between gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-slate-900">{a.user.fullName}</p>
                              <p className="text-xs text-slate-500">
                                {a.user.email} · Last login: {fmtDateTime(a.user.lastLoginAt)}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${
                                STATUS_BADGE[a.status] || STATUS_BADGE.active
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                        ))}
                        {detailEstate.admins.length === 0 && (
                          <p className="p-6 text-center text-sm text-slate-500">No estate admins assigned.</p>
                        )}
                      </div>
                    )}

                    {detailTab === "security" && (
                      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {detailEstate.securityStaff.map((s) => (
                          <div key={s.membershipId} className="p-4 flex items-center justify-between gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-slate-900">{s.user.fullName}</p>
                              <p className="text-xs text-slate-500">
                                {s.user.email} · Gate: {s.assignedGate || "Main"} · Shift: {s.shift || "—"}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${
                                STATUS_BADGE[s.status] || STATUS_BADGE.active
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                        ))}
                        {detailEstate.securityStaff.length === 0 && (
                          <p className="p-6 text-center text-sm text-slate-500">No security staff assigned.</p>
                        )}
                      </div>
                    )}

                    {detailTab === "passes" && (
                      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {detailEstate.passes.map((p) => (
                          <div key={p.id} className="p-3.5 flex items-center justify-between gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {p.visitorName} <span className="font-mono text-xs text-slate-500 ml-1">{p.code}</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                Host: {p.createdBy.fullName} ·{" "}
                                {p.house ? `${p.house.street}, House ${p.house.number}` : "—"}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${
                                STATUS_BADGE[p.status] || STATUS_BADGE.active
                              }`}
                            >
                              {p.status.replace("_", " ")}
                            </span>
                          </div>
                        ))}
                        {detailEstate.passes.length === 0 && (
                          <p className="p-6 text-center text-sm text-slate-500">No visitor passes issued yet.</p>
                        )}
                      </div>
                    )}

                    {detailTab === "logs" && (
                      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {detailEstate.gateLogs.map((l) => (
                          <div key={l.id} className="p-3.5 flex items-center justify-between gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {l.visitorName || `Code ${l.code}`} ·{" "}
                                <span className="capitalize font-normal text-slate-600">{l.action}</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                Officer: {l.officer.fullName} · {fmtDateTime(l.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                                l.result === "success"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {l.result}
                            </span>
                          </div>
                        ))}
                        {detailEstate.gateLogs.length === 0 && (
                          <p className="p-6 text-center text-sm text-slate-500">No gate logs recorded yet.</p>
                        )}
                      </div>
                    )}

                    {detailTab === "notices" && (
                      <div className="space-y-3">
                        {detailEstate.notices.map((n) => (
                          <div key={n.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm text-slate-900">{n.title}</h4>
                              <span className="text-xs text-slate-400">{fmtDateTime(n.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-2">Posted by {n.createdBy.fullName}</p>
                          </div>
                        ))}
                        {detailEstate.notices.length === 0 && (
                          <p className="p-6 text-center text-sm text-slate-500">No notices posted yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}

      {/* CREATE ESTATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Create New Estate</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEstate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {createError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estate Name *</label>
                <Input
                  required
                  value={newEstateName}
                  onChange={(e) => setNewEstateName(e.target.value)}
                  placeholder="e.g. Banana Island Royal Estate"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <Input
                    value={newEstateCity}
                    onChange={(e) => setNewEstateCity(e.target.value)}
                    placeholder="Lagos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Houses</label>
                  <Input
                    type="number"
                    value={newEstateHouses}
                    onChange={(e) => setNewEstateHouses(e.target.value)}
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <Input
                  value={newEstateAddress}
                  onChange={(e) => setNewEstateAddress(e.target.value)}
                  placeholder="Ikoyi, Lagos"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Initial Estate Admin (Optional)
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Admin Full Name</label>
                      <Input
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Admin Phone</label>
                      <Input
                        value={newAdminPhone}
                        onChange={(e) => setNewAdminPhone(e.target.value)}
                        placeholder="+234..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Admin Email</label>
                      <Input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@estate.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Temp Password</label>
                      <Input
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Min 8 chars"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingEstate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {creatingEstate ? "Creating..." : "Create Estate"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMED ACTIVATION MODAL */}
      {activateTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Activate Estate Access</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activateTarget.name}
                  {activateTarget.adminName ? ` · Admin: ${activateTarget.adminName}` : ""}
                </p>
              </div>
              <button
                onClick={() => setActivateTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Manual Duration + Period Dropdown */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Activation Duration
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    disabled={isUnlimited}
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-28 h-10 text-sm font-medium"
                  />
                  <select
                    disabled={isUnlimited}
                    value={durationUnit}
                    onChange={(e) =>
                      setDurationUnit(e.target.value as "hours" | "days" | "weeks" | "months" | "years")
                    }
                    className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="days">Daily (Days)</option>
                    <option value="weeks">Weekly (Weeks)</option>
                    <option value="months">Monthly (Months)</option>
                    <option value="years">Yearly (Years)</option>
                    <option value="hours">Hourly (Hours)</option>
                  </select>
                </div>
              </div>

              {/* Unlimited Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">No Expiration (Unlimited)</p>
                  <p className="text-xs text-slate-500">Keep estate active until you manually deactivate it.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isUnlimited}
                  onClick={() => setIsUnlimited((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    isUnlimited ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition ${
                      isUnlimited ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Live Preview of Exact Deactivation Date & Time */}
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                  Scheduled Deactivation Time
                </p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {isUnlimited
                    ? "Never expires (Active until manually deactivated)"
                    : previewDeactivationDate && !Number.isNaN(previewDeactivationDate.getTime())
                    ? previewDeactivationDate.toLocaleString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Enter a valid number (1 or more)"}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setActivateTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={activating || (!isUnlimited && !previewDeactivationDate)}
                  onClick={handleConfirmActivate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {activating ? "Activating..." : "Confirm & Activate"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
