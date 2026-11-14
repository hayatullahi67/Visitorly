"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShowcase } from "@/components/auth-showcase";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Home,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

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

type RoleOption = "resident" | "estate_security" | "estate_admin";

const roleChoices: {
  value: RoleOption;
  label: string;
  description: string;
  icon: typeof Home;
}[] = [
  {
    value: "resident",
    label: "Resident",
    description: "Create visitor passes & exit codes for your home.",
    icon: Home,
  },
  {
    value: "estate_security",
    label: "Security Officer",
    description: "Verify guest codes & log gate entries on duty.",
    icon: ShieldCheck,
  },
  {
    value: "estate_admin",
    label: "Estate Admin",
    description: "Register your estate, streets & approve members.",
    icon: Building2,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 fields
  const [role, setRole] = useState<RoleOption>("resident");
  const [estates, setEstates] = useState<EstateOption[]>([]);
  const [loadingEstates, setLoadingEstates] = useState(false);

  // Joining an existing estate (Resident / Estate Security)
  const [selectedEstateId, setSelectedEstateId] = useState("");
  const [selectedStreetId, setSelectedStreetId] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState("");

  // Creating a new estate (Estate Administrator — ALL required)
  const [estateName, setEstateName] = useState("");
  const [estateAddress, setEstateAddress] = useState("");
  const [estateCity, setEstateCity] = useState("");
  const [totalHouses, setTotalHouses] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLoadingEstates(true);
    fetch("/api/estates")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.estates) {
          setEstates(data.estates);
        }
      })
      .catch((err) => {
        console.error("Failed to load estates for registration:", err);
      })
      .finally(() => setLoadingEstates(false));
  }, []);

  const selectedEstate = estates.find((e) => String(e.id) === selectedEstateId);
  const selectedStreet = selectedEstate?.streets.find(
    (s) => String(s.id) === selectedStreetId
  );

  function handleContinueToStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (phone.trim()) {
      const cleanedPhone = phone.replace(/[\s\-().]/g, "");
      if (!/^\+?[0-9]{7,15}$/.test(cleanedPhone)) {
        setError("Please enter a valid phone number.");
        return;
      }
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStep(2);
  }

  async function handleCompleteRegistration(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    if (role === "resident") {
      if (!selectedEstateId) {
        setError("Estate selection is required.");
        return;
      }
      if (!selectedStreetId) {
        setError("Street selection is required.");
        return;
      }
      if (!selectedHouseId) {
        setError("House / Unit selection is required.");
        return;
      }
    } else if (role === "estate_security") {
      if (!selectedEstateId) {
        setError("Estate selection is required.");
        return;
      }
    } else if (role === "estate_admin") {
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
        setError("Enter a valid Total Number of Houses (at least 1).");
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      };

      if (role === "resident") {
        payload.estateId = Number(selectedEstateId);
        payload.streetId = Number(selectedStreetId);
        payload.houseId = Number(selectedHouseId);
      } else if (role === "estate_security") {
        payload.estateId = Number(selectedEstateId);
      } else if (role === "estate_admin") {
        payload.estateName = estateName.trim();
        payload.address = estateAddress.trim();
        payload.city = estateCity.trim();
        payload.totalHouses = Number(totalHouses.trim());
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error(
          ">>> Registration API Error:",
          data.error?.detail || data.error?.message || data
        );
        setError(
          data.error?.code && data.error.code !== "INTERNAL_ERROR"
            ? data.error.message
            : "Something went wrong. Please try again."
        );
        return;
      }

      if (data.redirectTo) {
        router.push(data.redirectTo);
        router.refresh();
        return;
      }

      if (data.emailAlreadyVerified) {
        router.push("/login");
        return;
      }

      router.push("/verify-email?email=" + encodeURIComponent(email.trim()));
    } catch (err) {
      console.error(">>> Registration Network/Client Error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-white text-slate-900">
      {/* Left: Clean form column */}
      <div className="flex flex-1 flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Visitorly home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-950">
              Visitorly<span className="text-indigo-600">.</span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>

        {/* Form container */}
        <div className="mx-auto my-10 w-full max-w-[420px]">
          {/* Step progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span className="font-semibold text-indigo-600">Step {step} of 2</span>
              <span>{step === 1 ? "Account details" : "Role & estate"}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="h-1.5 rounded-full bg-indigo-600" />
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  step === 2 ? "bg-indigo-600" : "bg-slate-200"
                }`}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleContinueToStep2} className="space-y-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
                  Create your account
                </h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  Enter your details to get started with Visitorly.
                </p>
              </div>

              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
                placeholder="e.g. Chinedu Okafor"
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
              />

              <Input
                label="Phone Number (optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 123 4567"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="register-password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="8+ characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="register-confirm-password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full gap-2" size="lg">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCompleteRegistration} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
                  Select your role
                </h1>
                <p className="mt-1.5 text-sm text-slate-600">
                  Choose how you&apos;ll use Visitorly in your estate.
                </p>
              </div>

              {/* Role selector cards */}
              <div className="grid gap-2.5">
                {roleChoices.map((choice) => {
                  const Icon = choice.icon;
                  const active = role === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => {
                        setError("");
                        setRole(choice.value);
                      }}
                      className={`flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition ${
                        active
                          ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            active ? "text-indigo-950" : "text-slate-900"
                          }`}
                        >
                          {choice.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {choice.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <hr className="border-slate-100" />

              {/* Role: Resident */}
              {role === "resident" && (
                <div className="space-y-4">
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
                      className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    >
                      <option value="">
                        {loadingEstates
                          ? "Loading estates..."
                          : "Choose your estate"}
                      </option>
                      {estates.map((est) => (
                        <option key={est.id} value={String(est.id)}>
                          {est.name}
                          {est.city ? ` (${est.city})` : ""}
                        </option>
                      ))}
                    </select>
                    {!loadingEstates && estates.length === 0 && (
                      <p className="text-xs text-amber-600">
                        No estates are open for sign-up yet. Ask your estate administrator to register the estate first.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:opacity-60"
                        required
                      >
                        <option value="">Select street</option>
                        {selectedEstate?.streets.map((st) => (
                          <option key={st.id} value={String(st.id)}>
                            {st.name}
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
                        className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:opacity-60"
                        required
                      >
                        <option value="">Select house</option>
                        {selectedStreet?.houses.map((h) => (
                          <option key={h.id} value={String(h.id)}>
                            House {h.number}
                          </option>
                        ))}
                      </select>
                      {selectedStreet && selectedStreet.houses.length === 0 && (
                        <p className="text-xs text-amber-600">
                          No houses have been added on this street yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Role: Estate Security */}
              {role === "estate_security" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Select Estate
                    </label>
                    <select
                      value={selectedEstateId}
                      onChange={(e) => setSelectedEstateId(e.target.value)}
                      className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    >
                      <option value="">
                        {loadingEstates
                          ? "Loading estates..."
                          : "The estate you guard"}
                      </option>
                      {estates.map((est) => (
                        <option key={est.id} value={String(est.id)}>
                          {est.name}
                          {est.city ? ` (${est.city})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-500">
                    Your full name from step 1 is shown on every gate decision you make.
                  </p>
                </div>
              )}

              {/* Role: Estate Administrator */}
              {role === "estate_admin" && (
                <div className="space-y-4">
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                  className="shrink-0"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                >
                  Complete Registration
                </Button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-500 transition"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Bottom bar */}
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Visitorly &middot; Role-based estate access
        </p>
      </div>

      {/* Right: Architectural product showcase */}
      <AuthShowcase />
    </main>
  );
}
