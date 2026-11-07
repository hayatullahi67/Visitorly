import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: string;
  trendColor?: "success" | "warning" | "danger" | "neutral";
  onClick?: () => void;
  className?: string;
}

const trendColors = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  neutral: "text-slate-500",
};

export function StatsCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendColor = "neutral",
  onClick,
  className,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:border-indigo-200",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
            {subtext && (
              <p className="text-xs text-slate-500">{subtext}</p>
            )}
            {trend && (
              <p className={cn("text-xs font-medium", trendColors[trendColor])}>
                {trend}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-indigo-50 p-2.5">
              <Icon className="h-5 w-5 text-indigo-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
