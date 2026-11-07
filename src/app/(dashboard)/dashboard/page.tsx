"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Users,
  Clock,
  Bell,
  Plus,
  LogOut,
  Home,
  History,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Placeholder data — will be replaced with real API calls
const mockStats = {
  activePasses: 3,
  insideNow: 1,
  totalPasses: 12,
  notices: 2,
};

const mockRecentPasses = [
  {
    id: 1,
    visitorName: "Chioma Adeyemi",
    code: "KUWGDD",
    status: "active",
    purpose: "personal",
    validTo: "Today, 6:00 PM",
  },
  {
    id: 2,
    visitorName: "Delivery - Jumia",
    code: "9X2PLM",
    status: "checked_in",
    purpose: "delivery",
    validTo: "Today, 4:00 PM",
  },
  {
    id: 3,
    visitorName: "Uncle Bola",
    code: "A1B2C3",
    status: "checked_out",
    purpose: "personal",
    validTo: "Yesterday",
  },
];

const statusVariant: Record<string, "success" | "warning" | "secondary" | "danger"> = {
  active: "success",
  checked_in: "warning",
  checked_out: "secondary",
  revoked: "danger",
  expired: "secondary",
};

export default function ResidentDashboard() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Home className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Good afternoon</p>
              <p className="text-xs text-slate-500">Palm Gardens • House 24</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard
            label="Expected"
            value={mockStats.activePasses}
            subtext="Active codes"
            icon={QrCode}
            trend="Active"
            trendColor="success"
          />
          <StatsCard
            label="Inside Now"
            value={mockStats.insideNow}
            subtext="Currently visiting"
            icon={Users}
            trend="Checked in"
            trendColor="warning"
          />
          <StatsCard
            label="All Codes"
            value={mockStats.totalPasses}
            subtext="All time"
            icon={History}
          />
          <StatsCard
            label="Notices"
            value={mockStats.notices}
            subtext="From estate"
            icon={Bell}
          />
        </div>

        {/* Quick action */}
        <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div>
              <h3 className="text-lg font-semibold">Expecting a visitor?</h3>
              <p className="text-indigo-100 text-sm mt-1">
                Create a QR code they can show at the gate.
              </p>
            </div>
            <Button
              variant="secondary"
              className="bg-white text-indigo-700 hover:bg-indigo-50 shrink-0"
              asChild
            >
              <Link href="/dashboard/issue">
                <Plus className="h-4 w-4" />
                Create Pass
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent codes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Codes</CardTitle>
            <Link
              href="/dashboard/passes"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockRecentPasses.map((pass) => (
              <div
                key={pass.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {pass.visitorName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {pass.code} • {pass.validTo}
                    </p>
                  </div>
                </div>
                <Badge variant={statusVariant[pass.status] || "secondary"}>
                  {pass.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white sm:hidden">
        <div className="flex items-center justify-around h-16">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "passes", icon: QrCode, label: "Passes" },
            { id: "issue", icon: Plus, label: "Create" },
            { id: "activity", icon: History, label: "Activity" },
            { id: "profile", icon: User, label: "Profile" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 text-xs ${
                activeTab === item.id
                  ? "text-indigo-600"
                  : "text-slate-400"
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
