import React from "react";

export default function Card({
  title,
  right,
  children
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-semibold">{title}</div>
          <div>{right}</div>
        </div>
      )}
      {children}
    </div>
  );
}