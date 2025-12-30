import { getAuthToken, getServerUrl } from "./db";

async function req(path: string, init?: RequestInit) {
  const base = await getServerUrl();
  if (!base) throw new Error("Servidor não configurado em Ajustes.");
  const token = await getAuthToken();

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Erro ${res.status}: ${txt || res.statusText}`);
  }
  return res.json();
}

export const api = {
  async register(email: string, password: string, name: string) {
    return req("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name })
    });
  },
  async login(email: string, password: string) {
    return req("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  async push(changes: any[]) {
    return req("/sync/push", {
      method: "POST",
      body: JSON.stringify({ changes })
    });
  },
  async pull(since: number) {
    return req("/sync/pull?since=" + encodeURIComponent(String(since)));
  }
};