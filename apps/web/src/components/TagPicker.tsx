import React from "react";

export default function TagPicker({
  tags,
  selected,
  onToggle
}: {
  tags: string[];
  selected: string[];
  onToggle: (t: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const on = selected.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => onToggle(t)}
            className={`px-3 py-2 rounded-xl text-sm border transition ${
              on ? "bg-accent text-black border-accent" : "bg-zinc-950 text-white border-zinc-800"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}