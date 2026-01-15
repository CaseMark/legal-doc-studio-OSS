"use client";

import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  className?: string;
  timeRemaining?: string;
}

export function UsageMeter({ label, used, limit, className, timeRemaining }: UsageMeterProps) {
  const percentage = Math.min(100, (used / limit) * 100);

  // Color based on usage level
  const getBarColor = () => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-primary";
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium",
          percentage >= 100 ? "text-red-600 dark:text-red-400" : "text-foreground"
        )}>
          {used}/{limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {timeRemaining && (
        <p className="text-xs text-muted-foreground">
          Resets in {timeRemaining}
        </p>
      )}
    </div>
  );
}
