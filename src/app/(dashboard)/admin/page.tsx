"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Shield,
  ShieldCheck,
  MapPin,
  Home,
  LogOut,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  Edit3,
  Clock3,
  UserCheck,
  UserX,
  ArrowRight,
  X,
  Bell,
  ScrollText,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TabType =
  | "overview"
  | "approvals"
  | "residents"
  | "security"
  | "streets"
  | "activity"
  | "notices";

type AdminPassItem = {
  id: number;
  code: string;
  visitorName: string;
  phone: string | null;
  purpose: string;
  status: string;
  effectiveStatus: string;
  validFrom: string;
  validTo: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  house: string | null;
  hostName: string | null;
  admittedByName: string | null;
};

type AdminGateLogItem = {
  id: number;
  code: string;
  action: "entry" | "exit";
  result: "success" | "denied";
  reason: string | null;
  createdAt: string;
  officerName: string;
  visitorName: string;
  house: string | null;
};

type AdminNoticeItem = {
  id: number;
  title: string;
  message: string;
  authorName: string;
  createdAt: string;
};

type HouseItem = {
  id: number;
  number: string;
  residentCount: number;
  passCount: number;
};

type StreetItem = {
  id: number;
  name: string;
  houses: HouseItem[];
};

type MemberItem = {
  id: number;
  userId: number;
  role: "resident" | "estate_security" | "estate_admin";
  status: "pending" | "active" | "suspended" | "rejected";
  assignedGate?: string | null;
  shift?: string | null;
  changeRequestedAt?: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    phone?: string | null;
    status: string;
    lastLoginAt?: string | null;
  };
  house?: {
    id: number;
    number: string;
    streetId: number;
    street: string;
  } | null;
  requestedHouse?: {
    id: number;
    number: string;
    streetId: number;
    street: string;
  } | null;
};

type OverviewStats = {
  activeResidents: number;
  pendingApprovals: number;
  pendingHouseChanges: number;
  activeSecurity: number;
  totalStreets: number;
  totalHouses: number;
  activePasses: number;
  checkedInVisitors: number;
};

export default function EstateAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [adminName, setAdminName] = useState("Administrator");
  const [estateId, setEstateId] = useState<number | null>(null);
  const [estateName, setEstateName] = useState("My Estate");
  const [estateCity, setEstateCity] = useState("");
  const [estateAddress, setEstateAddress] = useState("");
  const [estateTotalHouses, setEstateTotalHouses] = useState("");
  const [estateStatus, setEstateStatus] = useState<string>("active");
  const [estateActiveUntil, setEstateActiveUntil] = useState<string | null>(null);

  const [stats, setStats] = useState<OverviewStats>({
    activeResidents: 0,
    pendingApprovals: 0,
    pendingHouseChanges: 0,
    activeSecurity: 0,
    totalStreets: 0,
    totalHouses: 0,
    activePasses: 0,
    checkedInVisitors: 0,
  });

  const [streets, setStreets] = useState<StreetItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [passes, setPasses] = useState<AdminPassItem[]>([]);
  const [gateLogs, setGateLogs] = useState<AdminGateLogItem[]>([]);
  const [notices, setNotices] = useState<AdminNoticeItem[]>([]);

  // Notices & Activity states
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [publishingNotice, setPublishingNotice] = useState(false);
  const [passSearch, setPassSearch] = useState("");
  const [passStatusFilter, setPassStatusFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "entry" | "exit" | "denied">("all");

  // Feedback banners
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busyId, setBusyId] = useState<string | number | null>(null);

  // Filters
  const [residentSearch, setResidentSearch] = useState("");
  const [residentStatusFilter, setResidentStatusFilter] = useState<string>("all");
  const [residentStreetFilter, setResidentStreetFilter] = useState<string>("all");

  const [securitySearch, setSecuritySearch] = useState("");
  const [securityStatusFilter, setSecurityStatusFilter] = useState<string>("all");

  // Street & House creation states
  const [newStreetName, setNewStreetName] = useState("");
  const [newStreetHouses, setNewStreetHouses] = useState("");
  const [creatingStreet, setCreatingStreet] = useState(false);
  const [batchHouseInputs, setBatchHouseInputs] = useState<Record<number, string>>({});

  // Estate profile update state
  const [savingEstate, setSavingEstate] = useState(false);

  // Modals: Add Resident / Add Security Officer
  const [showAddModal, setShowAddModal] = useState<"resident" | "estate_security" | null>(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberStreetId, setNewMemberStreetId] = useState("");
  const [newMemberHouseId, setNewMemberHouseId] = useState("");
  const [newMemberGate, setNewMemberGate] = useState("");
  const [newMemberShift, setNewMemberShift] = useState("");
  const [creatingMember, setCreatingMember] = useState(false);

  // Inline approval / edit states
  const [approvalHouseMap, setApprovalHouseMap] = useState<Record<number, string>>({});
  const [approvalGateMap, setApprovalGateMap] = useState<Record<number, string>>({});
  const [approvalShiftMap, setApprovalShiftMap] = useState<Record<number, string>>({});

  // Inline edit member modal
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [editStreetId, setEditStreetId] = useState("");
  const [editHouseId, setEditHouseId] = useState("");
  const [editGate, setEditGate] = useState("");
  const [editShift, setEditShift] = useState("");

  const loadAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.replace("/login");
        return;
      }
      const meData = await meRes.json();
      setAdminName(meData.user?.fullName || "Administrator");

      const activeMembership = meData.memberships?.find(
        (m: any) => m.id === meData.activeMembershipId
      );

      if (!activeMembership) {
        router.replace("/pending");
        return;
      }

      if (activeMembership.role !== "estate_admin") {
        router.replace(
          activeMembership.role === "estate_security" ? "/security" : "/dashboard"
        );
        return;
      }

      const [overviewRes, streetsRes, membersRes, passesRes, logsRes, noticesRes] =
        await Promise.all([
          fetch("/api/estate/admin/overview"),
          fetch("/api/estate/admin/streets"),
          fetch("/api/estate/admin/members"),
          fetch("/api/estate/passes"),
          fetch("/api/estate/logs"),
          fetch("/api/estate/notices"),
        ]);

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        if (overviewData.organization) {
          setEstateId(overviewData.organization.id);
          setEstateName(overviewData.organization.name || "My Estate");
          setEstateCity(overviewData.organization.city || "");
          setEstateAddress(overviewData.organization.address || "");
          setEstateTotalHouses(
            overviewData.organization.totalHouses
              ? String(overviewData.organization.totalHouses)
              : ""
          );
          setEstateStatus(overviewData.organization.status || "active");
          setEstateActiveUntil(overviewData.organization.activeUntil || null);
        }
        if (overviewData.stats) {
          setStats(overviewData.stats);
        }
      }

      if (streetsRes.ok) {
        const streetsData = await streetsRes.json();
        setStreets(streetsData.streets || []);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }

      if (passesRes.ok) {
        const passesData = await passesRes.json();
        setPasses(passesData.passes || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setGateLogs(logsData.logs || []);
      }

      if (noticesRes.ok) {
        const noticesData = await noticesRes.json();
        setNotices(noticesData.notices || []);
      }
    } catch (err) {
      console.error("Failed to load estate admin data:", err);
      setErrorMsg("Unable to load estate dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

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

  async function handlePublishNotice(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      setErrorMsg("Please enter both a notice title and message.");
      return;
    }

    setPublishingNotice(true);
    try {
      const res = await fetch("/api/estate/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noticeTitle.trim(),
          message: noticeMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || "Unable to publish notice.");
        return;
      }
      setSuccessMsg("Notice published to all estate residents and security officers.");
      setNoticeTitle("");
      setNoticeMessage("");
      await loadAllData(true);
    } catch (err) {
      console.error("Publish notice error:", err);
      setErrorMsg("Network error while publishing notice.");
    } finally {
      setPublishingNotice(false);
    }
  }

  async function handleDeleteNotice(noticeId: number) {
    clearMessages();
    setBusyId(`notice-${noticeId}`);
    try {
      const res = await fetch(`/api/estate/notices/${noticeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || "Unable to delete notice.");
        return;
      }
      setSuccessMsg("Notice removed.");
      await loadAllData(true);
    } catch (err) {
      console.error("Delete notice error:", err);
      setErrorMsg("Network error while deleting notice.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdminRevokePass(passId: number) {
    clearMessages();
    setBusyId(`pass-${passId}`);
    try {
      const res = await fetch(`/api/estate/passes/${passId}/revoke`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || "Unable to revoke pass.");
        return;
      }
      setSuccessMsg("Visitor pass revoked.");
      await loadAllData(true);
    } catch (err) {
      console.error("Revoke pass error:", err);
      setErrorMsg("Network error while revoking visitor pass.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveEstateProfile(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setSavingEstate(true);
    try {
      const res = await fetch("/api/estate/admin/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: estateName.trim(),
          city: estateCity.trim() || null,
          address: estateAddress.trim() || null,
          totalHouses: estateTotalHouses ? Number(estateTotalHouses) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Update estate profile error:", data);
        setErrorMsg(data.error?.message || "Failed to update estate profile.");
        return;
      }
      setSuccessMsg("Estate profile updated successfully.");
      await loadAllData(true);
    } catch (err) {
      console.error("Update estate error:", err);
      setErrorMsg("Something went wrong while updating estate details.");
    } finally {
      setSavingEstate(false);
    }
  }

  async function handleCreateStreet(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!newStreetName.trim()) {
      setErrorMsg("Please enter a street name.");
      return;
    }

    setCreatingStreet(true);
    try {
      const res = await fetch("/api/estate/admin/streets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStreetName.trim(),
          houses: newStreetHouses.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Create street error:", data);
        setErrorMsg(data.error?.message || "Unable to create street.");
        return;
      }
      setNewStreetName("");
      setNewStreetHouses("");
      setSuccessMsg(data.message || "Street created.");
      await loadAllData(true);
    } catch (err) {
      console.error("Create street request error:", err);
      setErrorMsg("Something went wrong while creating the street.");
    } finally {
      setCreatingStreet(false);
    }
  }

  async function handleDeleteStreet(streetId: number, streetName: string) {
    clearMessages();
    setBusyId(`street-${streetId}`);
    try {
      const res = await fetch(`/api/estate/admin/streets/${streetId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Delete street error:", data);
        setErrorMsg(data.error?.message || `Unable to delete ${streetName}.`);
        return;
      }
      setSuccessMsg(`Street "${streetName}" deleted.`);
      await loadAllData(true);
    } catch (err) {
      console.error("Delete street request error:", err);
      setErrorMsg("Something went wrong while deleting the street.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddHousesToStreet(streetId: number) {
    clearMessages();
    const rawNumbers = batchHouseInputs[streetId]?.trim();
    if (!rawNumbers) {
      setErrorMsg("Enter at least one house number (e.g. 1, 2, 3A).");
      return;
    }

    setBusyId(`add-house-${streetId}`);
    try {
      const res = await fetch(`/api/estate/admin/streets/${streetId}/houses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: rawNumbers }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Add houses error:", data);
        setErrorMsg(data.error?.message || "Unable to add houses.");
        return;
      }
      setBatchHouseInputs((prev) => ({ ...prev, [streetId]: "" }));
      setSuccessMsg(data.message || "Houses added.");
      await loadAllData(true);
    } catch (err) {
      console.error("Add houses request error:", err);
      setErrorMsg("Something went wrong while adding houses.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteHouse(houseId: number, houseNumber: string) {
    clearMessages();
    setBusyId(`house-${houseId}`);
    try {
      const res = await fetch(`/api/estate/admin/houses/${houseId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Delete house error:", data);
        setErrorMsg(data.error?.message || `Unable to delete House ${houseNumber}.`);
        return;
      }
      setSuccessMsg(`House ${houseNumber} deleted.`);
      await loadAllData(true);
    } catch (err) {
      console.error("Delete house request error:", err);
      setErrorMsg("Something went wrong while deleting the house.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateMembership(
    membershipId: number,
    payload: {
      status?: "active" | "suspended" | "rejected" | "pending";
      houseId?: number | null;
      assignedGate?: string | null;
      shift?: string | null;
      houseChangeDecision?: "approve" | "reject";
    }
  ) {
    clearMessages();
    setBusyId(`member-${membershipId}`);
    try {
      const res = await fetch(`/api/estate/admin/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Update member error:", data);
        setErrorMsg(data.error?.message || "Unable to update member.");
        return;
      }
      setSuccessMsg(data.message || "Member updated.");
      setEditingMember(null);
      await loadAllData(true);
    } catch (err) {
      console.error("Update member request error:", err);
      setErrorMsg("Something went wrong while updating the member.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!showAddModal) return;
    clearMessages();

    if (showAddModal === "resident" && !newMemberHouseId) {
      setErrorMsg("Please select a street and house for the resident.");
      return;
    }

    setCreatingMember(true);
    try {
      const res = await fetch("/api/estate/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newMemberName.trim(),
          email: newMemberEmail.trim(),
          phone: newMemberPhone.trim() || undefined,
          password: newMemberPassword,
          role: showAddModal,
          houseId: showAddModal === "resident" ? Number(newMemberHouseId) : null,
          assignedGate:
            showAddModal === "estate_security" ? newMemberGate.trim() || null : null,
          shift:
            showAddModal === "estate_security" ? newMemberShift.trim() || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Create member error:", data);
        setErrorMsg(data.error?.message || "Unable to create member.");
        return;
      }

      setSuccessMsg(data.message || "Member created successfully.");
      setShowAddModal(null);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPhone("");
      setNewMemberPassword("");
      setNewMemberStreetId("");
      setNewMemberHouseId("");
      setNewMemberGate("");
      setNewMemberShift("");
      await loadAllData(true);
    } catch (err) {
      console.error("Create member request error:", err);
      setErrorMsg("Something went wrong while creating the member.");
    } finally {
      setCreatingMember(false);
    }
  }

  // Computed lists
  const pendingJoinMembers = members.filter((m) => m.status === "pending");
  const pendingMoveMembers = members.filter(
    (m) => m.role === "resident" && m.status === "active" && m.requestedHouse
  );
  const totalPendingCount = pendingJoinMembers.length + pendingMoveMembers.length;

  const residentMembers = members.filter((m) => {
    if (m.role !== "resident") return false;
    if (residentStatusFilter !== "all" && m.status !== residentStatusFilter) {
      return false;
    }
    if (
      residentStreetFilter !== "all" &&
      String(m.house?.streetId) !== residentStreetFilter
    ) {
      return false;
    }
    if (residentSearch.trim()) {
      const q = residentSearch.toLowerCase();
      const matchName = m.user.fullName.toLowerCase().includes(q);
      const matchEmail = m.user.email.toLowerCase().includes(q);
      const matchPhone = (m.user.phone || "").toLowerCase().includes(q);
      const matchHouse = `${m.house?.street || ""} ${m.house?.number || ""}`
        .toLowerCase()
        .includes(q);
      return matchName || matchEmail || matchPhone || matchHouse;
    }
    return true;
  });

  const securityMembers = members.filter((m) => {
    if (m.role !== "estate_security") return false;
    if (securityStatusFilter !== "all" && m.status !== securityStatusFilter) {
      return false;
    }
    if (securitySearch.trim()) {
      const q = securitySearch.toLowerCase();
      const matchName = m.user.fullName.toLowerCase().includes(q);
      const matchEmail = m.user.email.toLowerCase().includes(q);
      const matchPhone = (m.user.phone || "").toLowerCase().includes(q);
      const matchGate = (m.assignedGate || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchGate;
    }
    return true;
  });

  const allHousesFlat = streets.flatMap((s) =>
    s.houses.map((h) => ({
      id: h.id,
      number: h.number,
      streetId: s.id,
      streetName: s.name,
    }))
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Loading Estate Admin Portal...</p>
        </div>
      </div>
    );
  }

  const adminInitials = (adminName || "EA")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("") || "EA";

  const tabTitles: Record<TabType, string> = {
    overview: "Overview",
    approvals: "Pending Approvals",
    residents: "Residents",
    security: "Security Team",
    streets: "Streets & Houses",
    activity: "Passes & Gate Log",
    notices: "Estate Notices",
  };

  function navigateTab(tab: TabType) {
    clearMessages();
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

        {/* Estate Context & Primary CTA */}
        <div className="p-4 space-y-3 border-b border-slate-100">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <p className="truncate text-xs font-semibold text-slate-900">
                {estateName}
              </p>
            </div>
            <p className="mt-1 truncate pl-4 text-xs text-slate-500">
              {estateCity ? `${estateCity} · ` : ""}Estate Admin
            </p>
          </div>

          <Button
            className="w-full justify-center"
            onClick={() => {
              clearMessages();
              setShowAddModal("resident");
            }}
          >
            <Plus className="h-4 w-4" />
            Add Resident
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Estate Management
            </p>
            <nav className="mt-2 space-y-1">
              {[
                { id: "overview", label: "Overview", icon: Building2 },
                {
                  id: "approvals",
                  label: "Approvals",
                  icon: CheckCircle2,
                  badge: totalPendingCount,
                  isWarning: true,
                },
                {
                  id: "residents",
                  label: "Residents",
                  icon: Users,
                  badge: stats.activeResidents,
                },
                {
                  id: "security",
                  label: "Security Team",
                  icon: Shield,
                  badge: stats.activeSecurity,
                },
                {
                  id: "streets",
                  label: "Streets & Houses",
                  icon: MapPin,
                  badge: stats.totalStreets,
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
                            : item.isWarning
                            ? "bg-amber-100 text-amber-800"
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
              Operations
            </p>
            <nav className="mt-2 space-y-1">
              {[
                {
                  id: "activity",
                  label: "Passes & Gate Log",
                  icon: ScrollText,
                  badge: stats.activePasses + stats.checkedInVisitors,
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
        </div>

        {/* Bottom Admin Footer */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-slate-50 transition-colors">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                {adminInitials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {adminName}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Estate Administrator
                </p>
              </div>
            </div>
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
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-8">
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
                  {estateName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => {
                  clearMessages();
                  setShowAddModal("estate_security");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Security
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
          </div>

          {/* Mobile Horizontal Tab Strip */}
          <div className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
            {[
              { id: "overview", label: "Overview" },
              { id: "approvals", label: `Approvals (${totalPendingCount})` },
              { id: "residents", label: "Residents" },
              { id: "security", label: "Security" },
              { id: "streets", label: "Streets" },
              { id: "activity", label: "Gate Log" },
              { id: "notices", label: "Notices" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigateTab(t.id as TabType)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === t.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
          {/* Estate Verification / Activation Banner */}
          {estateStatus === "pending" && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
              <Clock3 className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Pending Super Admin Verification</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your estate is registered and awaiting verification from the Visitorly platform owner. You can view your dashboard, but accepting residents, adding residents, adding streets/houses, and managing security are locked until your estate is activated.
                </p>
              </div>
            </div>
          )}

          {(estateStatus === "suspended" || estateStatus === "rejected") && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900">
              <Ban className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Estate Access Deactivated</p>
                <p className="text-xs text-rose-800 mt-0.5">
                  Your estate access is currently deactivated{estateActiveUntil ? ` (expired ${new Date(estateActiveUntil).toLocaleString()})` : ""}. All management actions are locked until the Super Admin reactivates your estate.
                </p>
              </div>
            </div>
          )}

          {estateStatus === "active" && estateActiveUntil && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-800">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Estate Verified &amp; Active
              </span>
              <span className="font-medium">
                Active until: {new Date(estateActiveUntil).toLocaleString()}
              </span>
            </div>
          )}

          {/* Global Feedback Banners */}
          {errorMsg && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg("")}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ==================== OVERVIEW TAB ==================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Clean Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    {estateName}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage streets, houses, resident accounts, and security officers from one place.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:hidden">
                  <Button
                    size="sm"
                    onClick={() => {
                      clearMessages();
                      setShowAddModal("resident");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Resident
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      clearMessages();
                      setShowAddModal("estate_security");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Security
                  </Button>
                </div>
              </div>

              {/* Pending Approvals Alert */}
              {totalPendingCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Clock3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-950">
                        {totalPendingCount} Pending Request{totalPendingCount === 1 ? "" : "s"} Awaiting Your Review
                      </p>
                      <p className="text-xs text-amber-800">
                        Review incoming resident registrations, security officer requests, or house changes.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("approvals")}
                  >
                    Review Requests
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Separate 4-Column Stats Cards */}
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("residents")}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-indigo-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Active Residents
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {stats.activeResidents}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Approved residents</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("approvals")}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-amber-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Pending Approvals
                    </span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        totalPendingCount > 0
                          ? "bg-amber-50 text-amber-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {totalPendingCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {totalPendingCount > 0 ? "Action required" : "All caught up"}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-emerald-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Security Officers
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                      <Shield className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {stats.activeSecurity}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Active at gates</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("streets")}
                  className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-indigo-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Streets &amp; Houses
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                      <Home className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                    {stats.totalStreets} / {stats.totalHouses}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Streets / House units</p>
                </button>
              </div>

            {/* Quick Setup Guide & Estate Profile Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Estate Profile & Settings</CardTitle>
                  <CardDescription>
                    Update your estate&apos;s official name, address, and capacity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveEstateProfile} className="space-y-4">
                    <Input
                      label="Estate Name"
                      value={estateName}
                      onChange={(e) => setEstateName(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="City / State"
                        placeholder="e.g. Ikeja, Lagos"
                        value={estateCity}
                        onChange={(e) => setEstateCity(e.target.value)}
                        required
                      />
                      <Input
                        label="Total Number of Houses"
                        type="number"
                        min={1}
                        placeholder="e.g. 150"
                        value={estateTotalHouses}
                        onChange={(e) => setEstateTotalHouses(e.target.value)}
                        required
                      />
                    </div>
                    <Input
                      label="Estate Physical Address"
                      placeholder="Plot/Street name"
                      value={estateAddress}
                      onChange={(e) => setEstateAddress(e.target.value)}
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" isLoading={savingEstate}>
                        Save Estate Details
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>
                    Common estate management workflows
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab("streets")}
                  >
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    Configure Streets & Houses
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      clearMessages();
                      setShowAddModal("resident");
                    }}
                  >
                    <Users className="h-4 w-4 text-indigo-600" />
                    Create Resident Account
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      clearMessages();
                      setShowAddModal("estate_security");
                    }}
                  >
                    <Shield className="h-4 w-4 text-indigo-600" />
                    Create Security Officer
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab("approvals")}
                  >
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    Review Pending Approvals ({totalPendingCount})
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ==================== APPROVALS TAB ==================== */}
        {activeTab === "approvals" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Pending Estate Join Requests ({pendingJoinMembers.length})
                </CardTitle>
                <CardDescription>
                  Verify the identity and unit assignment of residents and security officers requesting access to {estateName}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingJoinMembers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-900">
                      No pending join requests
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      When residents or security officers request to join your estate, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingJoinMembers.map((m) => {
                      const selectedHouseForApproval =
                        approvalHouseMap[m.id] !== undefined
                          ? approvalHouseMap[m.id]
                          : m.house?.id
                          ? String(m.house.id)
                          : "";

                      return (
                        <div
                          key={m.id}
                          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-900">
                                {m.user.fullName}
                              </p>
                              <Badge variant="warning">PENDING</Badge>
                              <Badge variant="default">
                                {m.role === "resident" ? "Resident" : "Security Officer"}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600">
                              {m.user.email}
                              {m.user.phone ? ` • ${m.user.phone}` : ""}
                            </p>
                            {m.role === "resident" && (
                              <p className="text-xs font-medium text-indigo-700">
                                Requested Unit:{" "}
                                {m.house
                                  ? `${m.house.street}, House ${m.house.number}`
                                  : "Not assigned yet"}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {m.role === "resident" ? (
                              <select
                                value={selectedHouseForApproval}
                                onChange={(e) =>
                                  setApprovalHouseMap((prev) => ({
                                    ...prev,
                                    [m.id]: e.target.value,
                                  }))
                                }
                                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                              >
                                <option value="">-- Assign Street & House --</option>
                                {allHousesFlat.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.streetName} — House {h.number}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Assigned Gate (e.g. Main Gate)"
                                  value={approvalGateMap[m.id] ?? m.assignedGate ?? ""}
                                  onChange={(e) =>
                                    setApprovalGateMap((prev) => ({
                                      ...prev,
                                      [m.id]: e.target.value,
                                    }))
                                  }
                                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                                />
                                <input
                                  type="text"
                                  placeholder="Shift (e.g. Day Shift)"
                                  value={approvalShiftMap[m.id] ?? m.shift ?? ""}
                                  onChange={(e) =>
                                    setApprovalShiftMap((prev) => ({
                                      ...prev,
                                      [m.id]: e.target.value,
                                    }))
                                  }
                                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="success"
                                isLoading={busyId === `member-${m.id}`}
                                onClick={() =>
                                  handleUpdateMembership(m.id, {
                                    status: "active",
                                    ...(m.role === "resident"
                                      ? {
                                          houseId: selectedHouseForApproval
                                            ? Number(selectedHouseForApproval)
                                            : null,
                                        }
                                      : {
                                          assignedGate:
                                            approvalGateMap[m.id] ?? m.assignedGate ?? null,
                                          shift:
                                            approvalShiftMap[m.id] ?? m.shift ?? null,
                                        }),
                                  })
                                }
                              >
                                <UserCheck className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                isLoading={busyId === `member-${m.id}`}
                                onClick={() =>
                                  handleUpdateMembership(m.id, { status: "rejected" })
                                }
                              >
                                <UserX className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending House Move Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Pending House Change Requests ({pendingMoveMembers.length})
                </CardTitle>
                <CardDescription>
                  Active residents requesting to transfer their membership to another street or house unit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingMoveMembers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No pending house move requests.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingMoveMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {m.user.fullName}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Current:{" "}
                            <strong>
                              {m.house
                                ? `${m.house.street}, House ${m.house.number}`
                                : "None"}
                            </strong>{" "}
                            → Requested:{" "}
                            <strong className="text-indigo-600">
                              {m.requestedHouse
                                ? `${m.requestedHouse.street}, House ${m.requestedHouse.number}`
                                : "None"}
                            </strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            isLoading={busyId === `member-${m.id}`}
                            onClick={() =>
                              handleUpdateMembership(m.id, {
                                houseChangeDecision: "approve",
                              })
                            }
                          >
                            Approve Move
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={busyId === `member-${m.id}`}
                            onClick={() =>
                              handleUpdateMembership(m.id, {
                                houseChangeDecision: "reject",
                              })
                            }
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== RESIDENTS TAB ==================== */}
        {activeTab === "residents" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Residents Directory</CardTitle>
                  <CardDescription>
                    Manage resident accounts, assign houses, or suspend access.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    clearMessages();
                    setShowAddModal("resident");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Resident
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, email, phone, house..."
                      value={residentSearch}
                      onChange={(e) => setResidentSearch(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={residentStreetFilter}
                    onChange={(e) => setResidentStreetFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">All Streets</option>
                    {streets.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={residentStatusFilter}
                    onChange={(e) => setResidentStatusFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {residentMembers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-900">
                      No residents found
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Click &ldquo;Add Resident&rdquo; above to create a resident account directly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {residentMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {m.user.fullName}
                            </p>
                            <Badge
                              variant={
                                m.status === "active"
                                  ? "success"
                                  : m.status === "pending"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {m.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {m.user.email}
                            {m.user.phone ? ` • ${m.user.phone}` : ""}
                          </p>
                          <p className="text-xs font-medium text-slate-700">
                            <Home className="inline h-3.5 w-3.5 mr-1 text-indigo-600" />
                            {m.house
                              ? `${m.house.street}, House ${m.house.number}`
                              : "No house assigned"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMember(m);
                              setEditStreetId(
                                m.house?.streetId ? String(m.house.streetId) : ""
                              );
                              setEditHouseId(
                                m.house?.id ? String(m.house.id) : ""
                              );
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Change House
                          </Button>

                          {m.status === "active" ? (
                            <Button
                              size="sm"
                              variant="danger"
                              isLoading={busyId === `member-${m.id}`}
                              onClick={() =>
                                handleUpdateMembership(m.id, {
                                  status: "suspended",
                                })
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="success"
                              isLoading={busyId === `member-${m.id}`}
                              onClick={() =>
                                handleUpdateMembership(m.id, {
                                  status: "active",
                                })
                              }
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== SECURITY TEAM TAB ==================== */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Gate Security Team</CardTitle>
                  <CardDescription>
                    Manage security officers, assign gate posts and shifts, or revoke access.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    clearMessages();
                    setShowAddModal("estate_security");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Security Officer
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search officer name, email, phone, gate..."
                      value={securitySearch}
                      onChange={(e) => setSecuritySearch(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={securityStatusFilter}
                    onChange={(e) => setSecurityStatusFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {securityMembers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <Shield className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-900">
                      No security officers configured yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Add security personnel so they can verify visitor passes at the estate gate.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {securityMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {m.user.fullName}
                            </p>
                            <Badge
                              variant={
                                m.status === "active"
                                  ? "success"
                                  : m.status === "pending"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {m.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {m.user.email}
                            {m.user.phone ? ` • ${m.user.phone}` : ""}
                          </p>
                          <p className="text-xs font-medium text-slate-700">
                            Gate: <strong>{m.assignedGate || "Unassigned"}</strong> • Shift:{" "}
                            <strong>{m.shift || "Unassigned"}</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMember(m);
                              setEditGate(m.assignedGate || "");
                              setEditShift(m.shift || "");
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit Gate / Shift
                          </Button>

                          {m.status === "active" ? (
                            <Button
                              size="sm"
                              variant="danger"
                              isLoading={busyId === `member-${m.id}`}
                              onClick={() =>
                                handleUpdateMembership(m.id, {
                                  status: "suspended",
                                })
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="success"
                              isLoading={busyId === `member-${m.id}`}
                              onClick={() =>
                                handleUpdateMembership(m.id, {
                                  status: "active",
                                })
                              }
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== STREETS & HOUSES TAB ==================== */}
        {activeTab === "streets" && (
          <div className="space-y-6">
            {/* Create Street Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add a Street</CardTitle>
                <CardDescription>
                  Create a new street in {estateName}. You can also enter comma-separated house numbers to create the houses right away.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleCreateStreet}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
                >
                  <div className="sm:col-span-4">
                    <Input
                      label="Street Name"
                      placeholder="e.g. Orchid Drive"
                      value={newStreetName}
                      onChange={(e) => setNewStreetName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <Input
                      label="Initial House Numbers (Optional, comma-separated)"
                      placeholder="e.g. 1, 2, 3, 4A, 4B, 5"
                      value={newStreetHouses}
                      onChange={(e) => setNewStreetHouses(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button
                      type="submit"
                      className="w-full"
                      isLoading={creatingStreet}
                    >
                      <Plus className="h-4 w-4" />
                      Add Street
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Streets List */}
            <div className="space-y-4">
              {streets.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-900">
                      No streets configured yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Add your estate&apos;s streets and house numbers above so residents can be assigned to their homes.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                streets.map((street) => (
                  <Card key={street.id}>
                    <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-indigo-600" />
                          {street.name}
                          <Badge variant="secondary">
                            {street.houses.length} house{street.houses.length === 1 ? "" : "s"}
                          </Badge>
                        </CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        isLoading={busyId === `street-${street.id}`}
                        onClick={() => handleDeleteStreet(street.id, street.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Street
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Houses pills */}
                      {street.houses.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No houses added to this street yet.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {street.houses.map((house) => (
                            <div
                              key={house.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
                            >
                              <Home className="h-3.5 w-3.5 text-indigo-600" />
                              <span className="font-semibold text-slate-900">
                                House {house.number}
                              </span>
                              <span className="text-slate-500">
                                ({house.residentCount} resident{house.residentCount === 1 ? "" : "s"})
                              </span>
                              {house.residentCount === 0 && house.passCount === 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteHouse(house.id, house.number)
                                  }
                                  disabled={busyId === `house-${house.id}`}
                                  title="Delete empty house"
                                  className="ml-1 text-slate-400 hover:text-red-600"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Batch add houses to this street */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          placeholder="Add house numbers (comma-separated, e.g. 10, 11, 12A)..."
                          value={batchHouseInputs[street.id] || ""}
                          onChange={(e) =>
                            setBatchHouseInputs((prev) => ({
                              ...prev,
                              [street.id]: e.target.value,
                            }))
                          }
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs focus:border-indigo-500 focus:outline-none"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={busyId === `add-house-${street.id}`}
                          onClick={() => handleAddHousesToStreet(street.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Houses
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== PASSES & GATE LOG TAB ==================== */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            {/* Visitor Passes Section */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Estate Visitor Passes ({passes.length})</CardTitle>
                    <CardDescription>
                      Monitor all active, checked-in, completed, and cancelled visitor passes across the estate.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={passStatusFilter}
                      onChange={(e) => setPassStatusFilter(e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active (Expected)</option>
                      <option value="checked_in">Inside Now</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Cancelled</option>
                    </select>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={passSearch}
                        onChange={(e) => setPassSearch(e.target.value)}
                        placeholder="Search visitor, code, house..."
                        className="h-9 rounded-lg border border-slate-200 pl-8 pr-3 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {passes.filter((p) => {
                  const statusToMatch = p.effectiveStatus || p.status;
                  if (passStatusFilter !== "all" && statusToMatch !== passStatusFilter)
                    return false;
                  const q = passSearch.toLowerCase();
                  return (
                    !q ||
                    p.visitorName.toLowerCase().includes(q) ||
                    p.code.toLowerCase().includes(q) ||
                    (p.house || "").toLowerCase().includes(q) ||
                    (p.hostName || "").toLowerCase().includes(q)
                  );
                }).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                    No visitor passes match the selected filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {passes
                      .filter((p) => {
                        const statusToMatch = p.effectiveStatus || p.status;
                        if (
                          passStatusFilter !== "all" &&
                          statusToMatch !== passStatusFilter
                        )
                          return false;
                        const q = passSearch.toLowerCase();
                        return (
                          !q ||
                          p.visitorName.toLowerCase().includes(q) ||
                          p.code.toLowerCase().includes(q) ||
                          (p.house || "").toLowerCase().includes(q) ||
                          (p.hostName || "").toLowerCase().includes(q)
                        );
                      })
                      .map((pass) => {
                        const effective = pass.effectiveStatus || pass.status;
                        return (
                          <div
                            key={pass.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900">
                                  {pass.visitorName}
                                </span>
                                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
                                  {pass.code}
                                </span>
                                <Badge
                                  variant={
                                    effective === "checked_in" || effective === "active"
                                      ? "success"
                                      : effective === "revoked"
                                      ? "danger"
                                      : effective === "expired"
                                      ? "warning"
                                      : "secondary"
                                  }
                                >
                                  {effective.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">
                                {pass.house || "Estate Common Area"} • Host:{" "}
                                <span className="font-semibold">
                                  {pass.hostName || "—"}
                                </span>{" "}
                                • Purpose: {pass.purpose}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Valid: {new Date(pass.validFrom).toLocaleString()} —{" "}
                                {new Date(pass.validTo).toLocaleString()}
                                {pass.admittedByName
                                  ? ` • Admitted by ${pass.admittedByName}`
                                  : ""}
                              </p>
                            </div>
                            {effective === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                isLoading={busyId === `pass-${pass.id}`}
                                onClick={() => handleAdminRevokePass(pass.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Revoke Pass
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gate Log Section */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Estate Gate Log ({gateLogs.length})</CardTitle>
                    <CardDescription>
                      Complete audit trail of all gate entries, exits, and refusals with the security officer&apos;s full name.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
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
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                            logFilter === f.id
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        placeholder="Search logs..."
                        className="h-9 rounded-lg border border-slate-200 pl-8 pr-3 text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {gateLogs.filter((l) => {
                  if (
                    logFilter === "entry" &&
                    (l.action !== "entry" || l.result !== "success")
                  )
                    return false;
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
                }).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                    No gate log entries match your filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gateLogs
                      .filter((l) => {
                        if (
                          logFilter === "entry" &&
                          (l.action !== "entry" || l.result !== "success")
                        )
                          return false;
                        if (logFilter === "exit" && l.action !== "exit") return false;
                        if (logFilter === "denied" && l.result !== "denied")
                          return false;
                        const q = logSearch.toLowerCase();
                        return (
                          !q ||
                          l.visitorName.toLowerCase().includes(q) ||
                          l.code.toLowerCase().includes(q) ||
                          (l.house || "").toLowerCase().includes(q) ||
                          l.officerName.toLowerCase().includes(q)
                        );
                      })
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 p-4"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={
                                  log.result === "denied"
                                    ? "danger"
                                    : log.action === "entry"
                                    ? "success"
                                    : "default"
                                }
                              >
                                {log.result === "denied"
                                  ? "Refused Entry"
                                  : log.action === "entry"
                                  ? "Let In"
                                  : "Let Out"}
                              </Badge>
                              <span className="font-bold text-slate-900">
                                {log.visitorName}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                                {log.code}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">
                              Destination:{" "}
                              <span className="font-semibold">
                                {log.house || "Estate Common Area"}
                              </span>{" "}
                              • Security Officer:{" "}
                              <span className="font-semibold text-slate-900">
                                {log.officerName}
                              </span>
                            </p>
                            {log.reason && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                Reason / Note: {log.reason}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== ESTATE NOTICES TAB ==================== */}
        {activeTab === "notices" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1 h-fit">
              <CardHeader>
                <CardTitle>Publish Estate Notice</CardTitle>
                <CardDescription>
                  Broadcast an announcement or gate instruction to all Residents and Security Officers in {estateName}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePublishNotice} className="space-y-4">
                  <Input
                    label="Notice Title"
                    placeholder="e.g. Water Maintenance on Saturday"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    required
                  />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Announcement Message
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      placeholder="Write the full announcement for residents and security officers..."
                      className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={publishingNotice}
                  >
                    <Bell className="h-4 w-4" />
                    Publish Notice
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Published Notices ({notices.length})</CardTitle>
                <CardDescription>
                  All notices currently visible to residents and security officers in your estate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                    No notices have been published for this estate yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notices.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900">{n.title}</h4>
                            <span className="text-xs text-slate-400">
                              • {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-sm text-slate-600">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Posted by {n.authorName}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={busyId === `notice-${n.id}`}
                          onClick={() => handleDeleteNotice(n.id)}
                          className="text-red-600 hover:bg-red-50 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      </div>

      {/* ==================== MODAL: ADD RESIDENT / SECURITY OFFICER ==================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {showAddModal === "resident"
                    ? "Add New Resident"
                    : "Add Security Officer"}
                </h3>
                <p className="text-xs text-slate-500">
                  Create an active account with a starting password. They will be asked to change their password on first sign-in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMemberSubmit} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Chinedu Okafor"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="resident@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number (Optional)"
                  placeholder="e.g. 08031234567"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                />
              </div>

              <Input
                label="Starting Password (min 8 characters)"
                type="text"
                placeholder="e.g. Welcome2026!"
                value={newMemberPassword}
                onChange={(e) => setNewMemberPassword(e.target.value)}
                required
              />

              {showAddModal === "resident" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Street
                    </label>
                    <select
                      value={newMemberStreetId}
                      onChange={(e) => {
                        setNewMemberStreetId(e.target.value);
                        setNewMemberHouseId("");
                      }}
                      className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      required
                    >
                      <option value="">-- Select street --</option>
                      {streets.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      House Number
                    </label>
                    <select
                      value={newMemberHouseId}
                      onChange={(e) => setNewMemberHouseId(e.target.value)}
                      disabled={!newMemberStreetId}
                      className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                      required
                    >
                      <option value="">-- Select house --</option>
                      {streets
                        .find((s) => String(s.id) === newMemberStreetId)
                        ?.houses.map((h) => (
                          <option key={h.id} value={String(h.id)}>
                            House {h.number}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Assigned Gate (Optional)"
                    placeholder="e.g. Main Gate"
                    value={newMemberGate}
                    onChange={(e) => setNewMemberGate(e.target.value)}
                  />
                  <Input
                    label="Shift (Optional)"
                    placeholder="e.g. Morning (6AM - 6PM)"
                    value={newMemberShift}
                    onChange={(e) => setNewMemberShift(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={creatingMember}>
                  Create & Activate Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT MEMBER ASSIGNMENT ==================== */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Update {editingMember.user.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingMember.role === "resident"
                    ? "Reassign this resident to a different street or house."
                    : "Update this security officer's gate post and shift."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editingMember.role === "resident" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Street
                  </label>
                  <select
                    value={editStreetId}
                    onChange={(e) => {
                      setEditStreetId(e.target.value);
                      setEditHouseId("");
                    }}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">-- Select street --</option>
                    {streets.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    House Number
                  </label>
                  <select
                    value={editHouseId}
                    onChange={(e) => setEditHouseId(e.target.value)}
                    disabled={!editStreetId}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                  >
                    <option value="">-- Select house --</option>
                    {streets
                      .find((s) => String(s.id) === editStreetId)
                      ?.houses.map((h) => (
                        <option key={h.id} value={String(h.id)}>
                          House {h.number}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMember(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!editHouseId}
                    isLoading={busyId === `member-${editingMember.id}`}
                    onClick={() =>
                      handleUpdateMembership(editingMember.id, {
                        houseId: Number(editHouseId),
                      })
                    }
                  >
                    Save House Assignment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Assigned Gate"
                  placeholder="e.g. Main Gate"
                  value={editGate}
                  onChange={(e) => setEditGate(e.target.value)}
                />
                <Input
                  label="Shift"
                  placeholder="e.g. Night Shift (6PM - 6AM)"
                  value={editShift}
                  onChange={(e) => setEditShift(e.target.value)}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMember(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    isLoading={busyId === `member-${editingMember.id}`}
                    onClick={() =>
                      handleUpdateMembership(editingMember.id, {
                        assignedGate: editGate.trim() || null,
                        shift: editShift.trim() || null,
                      })
                    }
                  >
                    Save Assignment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
