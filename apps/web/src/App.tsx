import React, { useEffect, useState } from "react";
import { useRoutes, useNavigate, useLocation } from "react-router-dom";
import { routes } from "./router/routes";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";
import { db } from "./lib/db";

export default function App() {
  const element = useRoutes(routes);
  const nav = useNavigate();
  const loc = useLocation();
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const prof = await db.professor.toCollection().first();
      if (!prof && loc.pathname !== "/onboarding") {
        nav("/onboarding");
      }
    })().catch((e) => setToast(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Toast msg={toast} onClose={() => setToast("")} />
      <div className="max-w-3xl mx-auto p-4 pb-28 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold">Professor Pocket</div>
            <div className="text-xs text-zinc-400">Offline + Sync opcional • Preto & Laranja</div>
          </div>
          <div className="text-xs px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950">
            v1.0 MVP
          </div>
        </header>

        {element}
      </div>

      {loc.pathname !== "/onboarding" && <Navbar />}
    </div>
  );
}