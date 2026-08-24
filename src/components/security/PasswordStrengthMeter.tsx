/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { checkPasswordStrength } from "@/lib/validation";

const BAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-emerald-500",
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, failures, ok } = checkPasswordStrength(password);

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? BAR_COLORS[score] : "bg-border/50"}`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-medium ${ok ? "text-emerald-400" : "text-muted-foreground"}`}>
        Password strength: {label}
      </p>
      {failures.length > 0 && (
        <ul className="text-[10px] text-muted-foreground space-y-0.5">
          {failures.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
