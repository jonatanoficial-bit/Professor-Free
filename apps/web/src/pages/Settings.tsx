import React, { useEffect, useState } from "react";
import Card from "../components/Card";
import Field from "../components/Field";
import Button from "../components/Button";
import { clearAuthToken, getAuthToken, getServerUrl, setAuthToken, setServerUrl } from "../lib/db";
import { api } from "../lib/api";
import { runSync } from "../lib/sync";

export default function Settings() {
  const [serverUrl, setUrl] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [msg, setMsg] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => {
      setUrl(await getServerUrl());
      setHasToken(!!(await getAuthToken()));
    })();
  }, []);

  async function saveServer() {
    await setServerUrl(serverUrl);
    setMsg("Servidor salvo.");
  }

  async function login() {
    try {
      setMsg("");
      const resp = await api.login(email, password);
      const token = resp?.token as string;
      if (!token) throw new Error("Servidor não retornou token.");
      await setAuthToken(token);
      setHasToken(true);
      setMsg("Login OK.");
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  async function logout() {
    await clearAuthToken();
    setHasToken(false);
    setMsg("Saiu do online (offline continua).");
  }

  async function syncNow() {
    try {
      setMsg("");
      const r = await runSync();
      if (r.skipped) setMsg("Servidor não configurado.");
      else setMsg(`Sync: push ${r.pushed}, pull ${r.pulled}`);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Ajustes">
        <div className="space-y-4">
          <Field label="URL do servidor (opcional)">
            <input
              className="input"
              value={serverUrl}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Ex: http://localhost:8080"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={saveServer}>Salvar servidor</Button>
            <Button variant="ghost" onClick={syncNow}>Sincronizar agora</Button>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-2">Online (opcional)</div>
            {!hasToken ? (
              <div className="space-y-3">
                <Field label="Email">
                  <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Senha">
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                <Button onClick={login} className="w-full">Login</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-zinc-300">Você está logado para sincronização.</div>
                <Button variant="ghost" onClick={logout} className="w-full">Sair do online</Button>
              </div>
            )}
          </div>

          {msg && <div className="text-sm text-zinc-200">{msg}</div>}

          <div className="text-xs text-zinc-500">
            Sem servidor, o app continua offline e instalável.
          </div>
        </div>
      </Card>
    </div>
  );
}