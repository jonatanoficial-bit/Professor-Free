import React, { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Link } from "react-router-dom";
import { db } from "../lib/db";
import { runSync } from "../lib/sync";

export default function Home() {
  const [profName, setProfName] = useState("");
  const [stats, setStats] = useState({ schools: 0, classes: 0, students: 0, logs: 0 });
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    (async () => {
      const prof = await db.professor.toCollection().first();
      setProfName(prof?.name || "");
      const schools = await db.schools.count();
      const classes = await db.classes.count();
      const students = await db.students.count();
      const logs = await db.lessonLogs.count();
      setStats({ schools, classes, students, logs });
    })();
  }, []);

  async function doSync() {
    try {
      setSyncMsg("");
      const r = await runSync();
      if (r.skipped) setSyncMsg("Servidor não configurado. (Offline OK)");
      else setSyncMsg(`Sync: push ${r.pushed}, pull ${r.pulled}`);
    } catch (e: any) {
      setSyncMsg(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card title={`Olá, ${profName || "professor(a)"}!`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3">
            <div className="text-xs text-zinc-400">Escolas</div>
            <div className="text-xl font-extrabold">{stats.schools}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-zinc-400">Turmas</div>
            <div className="text-xl font-extrabold">{stats.classes}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-zinc-400">Alunos</div>
            <div className="text-xl font-extrabold">{stats.students}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs text-zinc-400">Registros</div>
            <div className="text-xl font-extrabold">{stats.logs}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/quick">
            <Button className="w-full">Registrar Aula (rápido)</Button>
          </Link>
          <Button variant="ghost" className="w-full" onClick={doSync}>
            Sincronizar (opcional)
          </Button>
        </div>

        {syncMsg && <div className="text-sm text-zinc-300 mt-3">{syncMsg}</div>}
      </Card>

      <Card title="Atalhos">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/schools"><Button variant="ghost" className="w-full">Escolas</Button></Link>
          <Link to="/classes"><Button variant="ghost" className="w-full">Turmas</Button></Link>
          <Link to="/students"><Button variant="ghost" className="w-full">Alunos</Button></Link>
          <Link to="/insights"><Button variant="ghost" className="w-full">Insights (IA)</Button></Link>
        </div>
      </Card>
    </div>
  );
}