"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock3,
  Home,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type HouseOption = { id: number; number: string };
type StreetOption = { id: number; name: string; houses: HouseOption[] };
type EstateOption = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  totalHouses?: number | null;
  streets: StreetOption[];
};

type MembershipItem = {
  id: number;
  role: "estate_admin" | "resident" | "estate_security" | string;
  status: "pending" | "active" | "suspended" | "rejected";
  organization: {
    id: number;
    name: string;
    city?: string | null;
    status: string;
  };
  house?: {
    id: number;
    number: string;
    street: string;
  } | null;
};

function formatRoleLabel(role: string) {
  switch (role) {
    case "estate_admin":
      return "Estate Administrator";
    case "estate_security":
      return "Estate Security";
    case "resident":
      return "Resident";
    default:
      return role.replace(/_/g, " ");
  }
}

export default function PendingPage() {
  const router = useRouter();
  const [userFullName, setUserFullName] = useState("");
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [estates, setEstates] = useState<EstateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [mode, setMode] = useState<"join" | "create">("join");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Join Estate state
  const [selectedEstateId, setSelectedEstateId] = useState<string>("");
  const [joinRole, setJoinRole] = useState<"resident" | "estate_security">("resident");
  const [selectedStreetId, setSelectedStreetId] = useState<string>("");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");

  // Create Estate state (All 4 required)
  const [estateName, setEstateName] = useState("");
  const [estateCity, setEstateCity] = useState("");
  const [estateAddress, setEstateAddress] = useState("");
  const [totalHouses, setTotalHouses] = useState("");

  async function loadStatusAndEstates(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const [meRes, estatesRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/estates"),
      ]);

      if (!meRes.ok) {
        router.replace("/login");
        return;
      }

      const meData = await meRes.json();
      setUserFullName(meData.user?.fullName || "");
      const list: MembershipItem[] = meData.memberships || [];
      setMemberships(list);

      // If an active membership now exists, route straight to its portal
      const activeMemberships = list.filter(
        (m) => m.status === "active" && m.organization.status === "active"
      );
      if (activeMemberships.length > 1) {
        router.replace("/select-estate");
        return;
      }
      if (activeMemberships.length === 1) {
        const active = activeMemberships[0];
        router.replace(
          active.role === "estate_admin"
            ? "/admin"
            : active.role === "estate_security"
            ? "/security"
            : "/dashboard"
        );
        return;
      }

      if (list.length === 0) {
        setShowOnboardingForm(true);
      } else if (isRefresh) {
        setSuccess("Still waiting. We will let you in as soon as your estate administrator approves you.");
      }

      if (estatesRes.ok) {
        const estatesData = await estatesRes.json();
        setEstates(estatesData.estates || []);
        if ((estatesData.estates || []).length === 0) {
          setMode("create");
        }
      }
    } catch (err) {
      console.error("Pending page load error:", err);
      setError("Unable to load estate onboarding information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStatusAndEstates(false);
  }, []);

  const selectedEstate = estates.find((e) => String(e.id) === selectedEstateId);
  const selectedStreet = selectedEstate?.streets.find(
    (s) => String(s.id) === selectedStreetId
  );

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedEstateId) {
      setError("Estate selection is required.");
      return;
    }

    if (joinRole === "resident" && (!selectedStreetId || !selectedHouseId)) {
      setError("Street and House / Unit selection are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/estates/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: Number(selectedEstateId),
          role: joinRole,
          houseId: joinRole === "resident" ? Number(selectedHouseId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Join estate error:", data);
        setError(data.error?.message || "Could not submit join request.");
        return;
      }

      setSuccess(
        data.message ||
          "Your request has been sent! Waiting for the estate administrator to approve."
      );
      setShowOnboardingForm(false);
      await loadStatusAndEstates(false);
    } catch (err) {
      console.error("Join estate request error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateEstateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (estateName.trim().length < 2) {
      setError("Estate Name is required.");
      return;
    }
    if (estateAddress.trim().length < 2) {
      setError("Estate Physical Address is required.");
      return;
    }
    if (estateCity.trim().length < 2) {
      setError("City / State is required.");
      return;
    }
    const houseCount = Number(totalHouses.trim());
    if (!Number.isInteger(houseCount) || houseCount < 1) {
      setError("Total Number of Houses is required (must be at least 1).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/estates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: estateName.trim(),
          city: estateCity.trim(),
          address: estateAddress.trim(),
          totalHouses: houseCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Create estate error:", data);
        setError(data.error?.message || "Could not create estate.");
        return;
      }

      router.replace("/admin");
    } catch (err) {
      console.error("Create estate request error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Checking your estate access...</p>
        </div>
      </main>
    );
  }

  const primaryMembership = memberships[0];
  const isWaiting =
    primaryMembership &&
    (primaryMembership.status === "pending" ||
      primaryMembership.organization.status === "pending");

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Visitorly</h1>
              <p className="text-xs text-slate-500">
                {userFullName ? `Signed in as ${userFullName}` : "Estate Access"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Waiting for Approval Screen */}
        {primaryMembership && !showOnboardingForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 text-amber-600">
              {isWaiting ? (
                <Clock3 className="h-10 w-10" />
              ) : (
                <Ban className="h-10 w-10 text-red-600" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                {isWaiting
                  ? "Waiting for Approval"
                  : primaryMembership.status === "rejected"
                  ? "Registration Not Approved"
                  : "Account Unavailable"}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                {isWaiting
                  ? "Your estate admin needs to confirm your registration. You will be able to sign in as soon as they approve you."
                  : "This estate membership cannot be opened right now."}
              </p>
            </div>

            {/* Membership summary table */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-left space-y-3">
              {memberships.map((m) => (
                <div
                  key={m.id}
                  className="space-y-2 border-b border-slate-200/70 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Estate</span>
                    <span className="font-semibold text-slate-900">
                      {m.organization.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Role</span>
                    <span className="font-semibold text-slate-900">
                      {formatRoleLabel(m.role)}
                    </span>
                  </div>
                  {m.house && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Details</span>
                      <span className="font-semibold text-slate-900">
                        {m.house.street}, House {m.house.number}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Status</span>
                    <Badge
                      variant={
                        m.status === "pending"
                          ? "warning"
                          : m.status === "active"
                          ? "success"
                          : "danger"
                      }
                    >
                      {m.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => loadStatusAndEstates(true)}
                isLoading={refreshing}
              >
                <RefreshCw className="h-4 w-4" />
                Check Again
              </Button>

              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setShowOnboardingForm(true);
                }}
              >
                Join or Create Another Estate
              </Button>
            </div>
          </section>
        )}

        {/* Onboarding Form: Join Existing Estate or Create New Estate */}
        {showOnboardingForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {memberships.length > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowOnboardingForm(false)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  ← Back to pending status
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("join");
                  setError("");
                  setSuccess("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === "join"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="h-4 w-4" />
                Join Existing Estate
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setError("");
                  setSuccess("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === "create"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Plus className="h-4 w-4" />
                Create New Estate
              </button>
            </div>

            {mode === "join" ? (
              <form onSubmit={handleJoinSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Select Role & Estate Details
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Select your role and the estate you want to join. The estate administrator will review and approve your request.
                  </p>
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Select Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setJoinRole("resident")}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        joinRole === "resident"
                          ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Home
                        className={`h-5 w-5 ${
                          joinRole === "resident" ? "text-indigo-600" : "text-slate-400"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Resident</p>
                        <p className="text-xs text-slate-500">Select street & house</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setJoinRole("estate_security")}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        joinRole === "estate_security"
                          ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Shield
                        className={`h-5 w-5 ${
                          joinRole === "estate_security"
                            ? "text-indigo-600"
                            : "text-slate-400"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Estate Security
                        </p>
                        <p className="text-xs text-slate-500">Guard estate gates</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Estate Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Select Estate
                  </label>
                  <select
                    value={selectedEstateId}
                    onChange={(e) => {
                      setSelectedEstateId(e.target.value);
                      setSelectedStreetId("");
                      setSelectedHouseId("");
                    }}
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    <option value="">
                      {joinRole === "estate_security"
                        ? "The estate you guard"
                        : "Choose your estate"}
                    </option>
                    {estates.map((estate) => (
                      <option key={estate.id} value={String(estate.id)}>
                        {estate.name}
                        {estate.city ? ` (${estate.city})` : ""}
                      </option>
                    ))}
                  </select>
                  {estates.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No estates have been registered yet. Switch to &ldquo;Create New Estate&rdquo; to set up an estate.
                    </p>
                  )}
                </div>

                {/* Street & House Dropdowns for Residents */}
                {joinRole === "resident" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        Street
                      </label>
                      <select
                        value={selectedStreetId}
                        onChange={(e) => {
                          setSelectedStreetId(e.target.value);
                          setSelectedHouseId("");
                        }}
                        disabled={!selectedEstate}
                        className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:opacity-60"
                        required
                      >
                        <option value="">Select street</option>
                        {selectedEstate?.streets.map((street) => (
                          <option key={street.id} value={String(street.id)}>
                            {street.name}
                          </option>
                        ))}
                      </select>
                      {selectedEstate && selectedEstate.streets.length === 0 && (
                        <p className="text-xs text-amber-600">
                          This estate has not added its streets yet. Ask your estate admin.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        House / Unit
                      </label>
                      <select
                        value={selectedHouseId}
                        onChange={(e) => setSelectedHouseId(e.target.value)}
                        disabled={!selectedStreet}
                        className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:opacity-60"
                        required
                      >
                        <option value="">Select house</option>
                        {selectedStreet?.houses.map((house) => (
                          <option key={house.id} value={String(house.id)}>
                            House {house.number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Your full name will appear on every gate decision you make.
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={submitting}
                  disabled={estates.length === 0}
                >
                  Submit Registration Request
                </Button>
              </form>
            ) : (
              <form onSubmit={handleCreateEstateSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Register a New Estate
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    All estate details below are required. You will become the Estate Administrator.
                  </p>
                </div>

                <Input
                  label="Estate Name"
                  placeholder="e.g. Greenwood Heights"
                  value={estateName}
                  onChange={(e) => setEstateName(e.target.value)}
                  required
                />

                <Input
                  label="Estate Physical Address"
                  placeholder="Plot/Street name"
                  value={estateAddress}
                  onChange={(e) => setEstateAddress(e.target.value)}
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
                    value={totalHouses}
                    onChange={(e) => setTotalHouses(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={submitting}
                >
                  Create Estate & Open Admin Portal
                </Button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
