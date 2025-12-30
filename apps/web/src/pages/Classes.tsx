import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import Field from "../components/Field";
import Modal from "../components/Modal";
import Select from "../components/Select";
import { db, uid } from "../lib/db";
import { classSchema } from "../lib/validate";
import { enqueueChange } from "../lib/sync";
import type { ClassGroup, School } from "../types/models";

export default function Classes() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [notes, setNotes] = useState("");

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ value: s.id, label: s.name })),
    [schools]
  );

  async function refresh() {
    setSchools(await db.schools.orderBy("updatedAt").reverse().toArray());
    setClasses(await db.classes.orderBy("updatedAt").reverse().toArray());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addClass() {
    try {
      setMsg("");
      const data = classSchema.parse({ schoolId, name, schedule: schedule || undefined, notes: notes || undefined });
      const now = Date.now();
      const c: ClassGroup = { id: uid("cls"), ...data, createdAt: now, updatedAt: now };
      await db.classes.put(c);
      await enqueueChange({ entity: "class", entityId: c.id, op: "upsert", payload: c, updatedAt: now });
      setOpen(false);
      setSchoolId(""); setName(""); setSchedule(""); setNotes("");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  async function removeClass(id: string) {
    if (!confirm("Excluir turma?")) return;
    const now = Date.now();
    await db.classes.delete(id);
    await enqueueChange({ entity: "class", entityId: id, op: "delete", payload: null, updatedAt: now });
    await refresh();
  }

  const schoolMap = useMemo(() => new Map(schools.map((s) => [s.id, s.name])), [schools]);

  return (
    <div className="space-y-4">
      <Card title="Turmas" right={<Button onClick={() => setOpen(true)}>Adicionar</Button>}>
        {classes.length === 0 ? (
          <div className="text-sm text-zinc-400">Nenhuma turma cadastrada.</div>
        ) : (
          <div className="space-y-3">
            {classes.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-zinc-400">
                      {schoolMap.get(c.schoolId) || "Escola?"}{c.schedule ? ` • ${c.schedule}` : ""}
                    </div>
                    {c.notes && <div className="text-sm text-zinc-300 mt-2">{c.notes}</div>}
                  </div>
                  <Button variant="ghost" onClick={() => removeClass(c.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} title="Nova Turma" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Escola">
            <Select value={schoolId} onChange={setSchoolId} placeholder="Selecione..." options={schoolOptions} />
          </Field>
          <Field label="Nome da turma">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: 2º Ano B" />
          </Field>
          <Field label="Horário (opcional)">
            <input className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Ex: Seg/Qua 19:00" />
          </Field>
          <Field label="Notas (opcional)">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações" />
          </Field>

          {msg && <div className="text-sm text-red-300">{msg}</div>}
          <Button className="w-full" onClick={addClass}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}