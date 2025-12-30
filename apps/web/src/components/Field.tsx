import React from "react";

export default function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="label">{label}</div>
      {children}
      {hint && <div className="text-xs text-zinc-400">{hint}</div>}
    </div>
  );
}