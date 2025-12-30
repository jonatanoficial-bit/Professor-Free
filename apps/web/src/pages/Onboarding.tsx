import React, { useMemo, useState } from "react";
import Field from "../components/Field";
import Button from "../components/Button";
import Card from "../components/Card";
import { professorSchema } from "../lib/validate";
import { db, uid, setAuthToken } from "../lib/db";
import { api } from "../lib/api";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [mainInstitution, setMainInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // opcional online
  const [password, setPassword] = useState("");
  const [useOnline, setUseOnline] = useState(false);
  const [msg, setMsg] = useState("");

  const canSubmit = useMemo(() => name.trim().length >= 2 && email.includes("@") && phone.trim().length >= 6, [
    name,
    email,
    phone
  ]);

  async function saveLocal() {
    const data = professorSchema.parse({
      name,
      email,
      phone,
      mainInstitution: mainInstitution || undefined
    });

    const now = Date.now();
    await db.professor.put({
      id: uid("prof"),
      ...data,
      createdAt: now,
      updatedAt: now
    });
  }

  async function onSubmit() {
    try {
      setMsg("");
      await saveLocal();

      if (useOnline) {
        if (password.length < 6) throw new Error("Senha precisa ter pelo menos 6 caracteres (online).");
        // tenta registrar no servidor configurado
        const resp = await api.register(email, password, name);
        const token = resp?.token as string;
        if (!token) throw new Error("Servidor não retornou token.");
        await setAuthToken(token);
      }

      window.location.href = "/";
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Cadastro do Professor (Primeiro Acesso)">
        <div className="space-y-4">
          <Field label="Nome">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </Field>

          <Field label="Instituição principal (opcional)">
            <input
              className="input"
              value={mainInstitution}
              onChange={(e) => setMainInstitution(e.target.value)}
              placeholder="Ex: Escola X / Studio Y"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email">
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
            </Field>
            <Field label="Telefone">
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(DDD) ..." />
            </Field>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Sincronização Online (opcional)</div>
                <div className="text-xs text-zinc-400">
                  Só funciona se você rodar o servidor gratuito. Sem servidor, o app continua 100% offline.
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={useOnline} onChange={(e) => setUseOnline(e.target.checked)} />
                <span className="text-sm">Ativar</span>
              </label>
            </div>

            {useOnline && (
              <div className="mt-3">
                <Field label="Senha (para login online)">
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="mínimo 6 caracteres"
                  />
                </Field>
                <div className="text-xs text-zinc-400 mt-2">
                  Dica: depois, em <b>Ajustes</b>, defina a URL do servidor (ex: http://localhost:8080).
                </div>
              </div>
            )}
          </div>

          {msg && <div className="text-sm text-red-300">{msg}</div>}

          <Button disabled={!canSubmit} onClick={onSubmit} className="w-full">
            Entrar no App
          </Button>

          <div className="text-xs text-zinc-500">
            Observação: Este MVP não usa API paga. A “IA” é um módulo local de cálculos e projeções.
          </div>
        </div>
      </Card>
    </div>
  );
}