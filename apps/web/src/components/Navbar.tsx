import React from "react";
import { NavLink } from "react-router-dom";

const Item = ({ to, label }: { to: string; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `px-3 py-2 rounded-xl text-sm font-semibold ${
        isActive ? "bg-accent text-black" : "bg-zinc-900 text-white border border-zinc-800"
      }`
    }
  >
    {label}
  </NavLink>
);

export default function Navbar() {
  return (
    <div className="sticky bottom-0 z-40 bg-black/90 backdrop-blur border-t border-zinc-900 p-3">
      <div className="max-w-3xl mx-auto flex gap-2 justify-between">
        <Item to="/" label="Home" />
        <Item to="/quick" label="Aula" />
        <Item to="/students" label="Alunos" />
        <Item to="/insights" label="Insights" />
        <Item to="/settings" label="Ajustes" />
      </div>
    </div>
  );
}