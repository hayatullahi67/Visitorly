"use client";

import { useState } from "react";
import {
  Shield,
  QrCode,
  Keyboard,
  Users,
  UserCheck,
  UserX,
  History,
  LogOut,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data – will be replaced with real API
const mockStats = {
  expected: 5,
  insideNow: 2,
  admittedToday: 8,
  deniedToday: 1,
};

const mockInside = [
  {
    id: 1,
    visitorName: "Chioma Adeyemi",
    code: "KUWGDD",
    house: "House 24, Palm Street",
    checkedInAt: "2:15 PM",
  },
  {
    id: 2,
    visitorName: "Delivery - Jumia",
    code: "9X2PLM",
    house: "House 11, Block B",
    checkedInAt: "1:40 PM",
  },
];

export default function SecurityDashboard() {
  const [code, setCode] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"terminal" | "inside" | "expected" | "logs">("terminal");

  async function handleLookup() {
    if (!code.trim()) {
      setError("Enter or scan a visitor code");
      return;
    }

    setError("");
    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const res = await fetch("/api/estate/gate/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Lookup failed");
        return;
      }

      setLookupResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleAdmit(passId: number) {
    try {
      const res = await fetch(`/api/estate/gate/passes/${passId}/admit`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setLookupResult(null);
        setCode("");
        // In real app we would refresh stats
      } else {
        setError(data.error?.message || "Could not admit visitor");
      }
    } catch {
      setError("Something went wrong");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Security Terminal</p>
              <p className="text-xs text-emerald-600 font-medium">On duty • Palm Gardens</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard
            label="Expected"
            value={mockStats.expected}
            subtext="Active codes"
            icon={QrCode}
          />
          <StatsCard
            label="Inside Now"
            value={mockStats.insideNow}
            subtext="Visitors in estate"
            icon={Users}
            trendColor="success"
          />
          <StatsCard
            label="Let In Today"
            value={mockStats.admittedToday}
            subtext="Since midnight"
            icon={UserCheck}
          />
          <StatsCard
            label="Refused Today"
            value={mockStats.deniedToday}
            subtext="Codes turned away"
            icon={UserX}
            trendColor="danger"
          />
        </div>

        {/* Terminal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gate Terminal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Input
                placeholder="Enter or scan visitor code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider"
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
              <Button onClick={handleLookup} isLoading={isLookingUp}>
                <Search className="h-4 w-4" />
                Check
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => {
                  // Placeholder for future QR scanner
                  alert("QR Scanner will open here (camera access)");
                }}
              >
                <QrCode className="h-8 w-8 text-indigo-600" />
                <span className="text-sm font-medium">Scan QR Code</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>(
                    'input[placeholder*="visitor code"]'
                  );
                  input?.focus();
                }}
              >
                <Keyboard className="h-8 w-8 text-indigo-600" />
                <span className="text-sm font-medium">Type Code</span>
              </Button>
            </div>

            {/* Lookup result */}
            {lookupResult && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {lookupResult.visitorName || "Unknown"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {lookupResult.house || "—"} • Code: {lookupResult.code}
                    </p>
                  </div>
                  <Badge
                    variant={
                      lookupResult.canAdmit
                        ? "success"
                        : lookupResult.verdict === "expired"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {lookupResult.verdict || "unknown"}
                  </Badge>
                </div>

                {lookupResult.canAdmit ? (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleAdmit(lookupResult.passId)}
                    >
                      Let In
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Deny
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    {lookupResult.message || "This code cannot be used right now."}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currently Inside */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Currently Inside</CardTitle>
            <Badge variant="secondary">{mockInside.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockInside.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No visitors inside right now
              </p>
            ) : (
              mockInside.map((visitor) => (
                <div
                  key={visitor.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900">
                      {visitor.visitorName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {visitor.house} • In since {visitor.checkedInAt}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Check Out
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-around h-16 max-w-5xl mx-auto">
          {[
            { id: "terminal", icon: Shield, label: "Terminal" },
            { id: "inside", icon: Users, label: "Inside" },
            { id: "expected", icon: QrCode, label: "Expected" },
            { id: "logs", icon: History, label: "Logs" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-0.5 text-xs ${
                activeTab === item.id ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
