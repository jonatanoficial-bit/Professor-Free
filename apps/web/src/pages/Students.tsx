import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import Field from "../components/Field";
import Modal from "../components/Modal";
import Select from "../components/Select";
import { db, uid } from "../lib/db";
import { studentSchema } from "../lib/validate";
import { enqueueChange } from "../lib/sync";
import type { Student, School, ClassGroup } from "../types/models";

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ value: s.id, label: s.name })),
    [schools]
  );
  const classOptions = useMemo(
    () => classes.filter((c) => c.schoolId === schoolId).map((c) => ({ value: c.id, label: c.name })),
    [classes, schoolId]
  );

  async function refresh() {
    setSchools(await db.schools.orderBy("updatedAt").reverse().toArray());
    setClasses(await db.classes.orderBy("updatedAt").reverse().toArray());
    setStudents(await db.students.orderBy("updatedAt").reverse().toArray());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addStudent() {
    try {
      setMsg("");
      const data = studentSchema.parse({
        schoolId,
        classId: classId || undefined,
        name,
        contact: contact || undefined,
        notes: notes || undefined
      });
      const now = Date.now();
      const st: Student = { id: uid("stu"), ...data, createdAt: now, updatedAt: now };
      await db.students.put(st);
      await enqueueChange({ entity: "student", entityId: st.id, op: "upsert", payload: st, updatedAt: now });
      setOpen(false);
      setSchoolId(""); setClassId(""); setName(""); setContact(""); setNotes("");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  async function removeStudent(id: string) {
    if (!confirm("Excluir aluno?")) return;
    const now = Date.now();
    await db.students.delete(id);
    await enqueueChange({ entity: "student", entityId: id, op: "delete", payload: null, updatedAt: now });
    await refresh();
  }

  const schoolMap = useMemo(() => new Map(schools.map((s) => [s.id, s.name])), [schools]);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);

  return (
    <div className="space-y-4">
      <Card title="Alunos" right={<Button onClick={() => setOpen(true)}>Adicionar</Button>}>
        {students.length === 0 ? (
          <div className="text-sm text-zinc-400">Nenhum aluno cadastrado.</div>
        ) : (
          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-zinc-400">
                      {schoolMap.get(s.schoolId) || "Escola?"}
                      {s.classId ? ` • ${classMap.get(s.classId) || "Turma?"}` : ""}
                    </div>
                    {s.contact && <div className="text-sm text-zinc-300 mt-2">Contato: {s.contact}</div>}
                    {s.notes && <div className="text-sm text-zinc-300 mt-1">{s.notes}</div>}
                  </div>
                  <Button variant="ghost" onClick={() => removeStudent(s.id)}>Excluir</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} title="Novo Aluno" onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <Field label="Escola">
            <Select value={schoolId} onChange={(v) => { setSchoolId(v); setClassId(""); }} placeholder="Selecione..." options={schoolOptions} />
          </Field>
          <Field label="Turma (opcional)">
            <Select value={classId} onChange={setClassId} placeholder="Selecione..." options={classOptions} />
          </Field>
          <Field label="Nome">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do aluno" />
          </Field>
          <Field label="Contato (opcional)">
            <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telefone/Email" />
          </Field>
          <Field label="Notas (opcional)">
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações" />
          </Field>

          {msg && <div className="text-sm text-red-300">{msg}</div>}
          <Button className="w-full" onClick={addStudent}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}