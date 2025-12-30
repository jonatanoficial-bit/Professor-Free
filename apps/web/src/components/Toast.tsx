import React from "react";

export default function Toast({
  msg,
  onClose
}: {
  msg: string;
  onClose: () => void;
}) {
  if (!msg) return null;
  return (
    <div className="fixed top-3 left-0 right-0 z-50 flex justify-center px-3">
      <div className="card px-4 py-3 flex items-center gap-3">
        <div className="text-sm">{msg}</div>
        <button className="text-accent font-bold" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}