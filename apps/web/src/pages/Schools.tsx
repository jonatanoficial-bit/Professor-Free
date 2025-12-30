import React, { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import Field from "../components/Field";
import Modal from "../components/Modal";
import { db, uid } from "../lib/db";
import { schoolSchema } from "../lib/validate";
import { enqueueChange } from "../lib/sync";
import type { School } from "../types/models";

export default function Schools() {
  const [items, setItems] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  async function refresh() {
    const arr = await db.schools.orderBy("updatedAt").reverse().toArray();
    setItems(arr);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addSchool() {
    try {
      setMsg("");
      const data = schoolSchema.parse({ name, address: address || undefined, notes: notes || undefined });
      const now = Date.now();
      const s: School = { id: uid("sch"), ...data, createdAt: now, updatedAt: now };
      await db.schools.put(s);
      await enqueueChange({ entity: "school", entityId: s.id, op: "upsert", payload: s, updatedAt: now });
      setOpen(false);
      setName(""); setAddress(""); setNotes("");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  async function removeSchool(id: string) {
    if (!confirm("Excluir escola? Isso não apaga turmas/alunos automaticamente no MVP.")) return;
    const now = Date.now();
    await db.schools.delete(id);
    await enqueueChange({ entity: "school", entityId: id, op: "delete", payload: null, updatedAt: now });
    await refresh();
  }

  return (
    <div className="space-y-4">
      <Card
        title="Escolas"
        right={<Button onClick={() => setOpen(true)}>Adicionar</Button>}
      >
        {items.length === 0 ? (
          <div className="text-sm text-zinc-400">Nenhuma escola cadastrada.</div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    {s.address && <div className="text-xs text-zinc-400">{s.address}</div>}
                    {s.notes && <div className="text-sm text-zinc-300 mt-2">{s.notes}</div>}
                  </div>
                  <Button variant="ghost" onClick={() => removeSchool(s.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} title="Nova Escola" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Nome">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Escola Central" />
          </Field>
          <Field label="Endereço (opcional)">
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua..." />
          </Field>
          <Field label="Notas (opcional)">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações" />
          </Field>

          {msg && <div className="text-sm text-red-300">{msg}</div>}

          <Button className="w-full" onClick={addSchool}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}