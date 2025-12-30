import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Field from "../components/Field";
import Select from "../components/Select";
import Button from "../components/Button";
import TagPicker from "../components/TagPicker";
import { db, uid } from "../lib/db";
import { enqueueChange } from "../lib/sync";
import { lessonLogSchema } from "../lib/validate";
import { NEED_TAGS, REPERTOIRE_SAMPLES } from "../lib/theme";
import type { School, ClassGroup, Student, LessonLog } from "../types/models";

export default function QuickLesson() {
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [msg, setMsg] = useState("");

  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");

  const [evolutionScore, setEvolutionScore] = useState(6);
  const [needs, setNeeds] = useState<string[]>([]);
  const [repertoire, setRepertoire] = useState<string[]>([]);
  const [plan, setPlan] = useState("");

  useEffect(() => {
    (async () => {
      setSchools(await db.schools.orderBy("updatedAt").reverse().toArray());
      setClasses(await db.classes.orderBy("updatedAt").reverse().toArray());
      setStudents(await db.students.orderBy("updatedAt").reverse().toArray());
    })();
  }, []);

  const schoolOptions = useMemo(() => schools.map((s) => ({ value: s.id, label: s.name })), [schools]);
  const classOptions = useMemo(
    () => classes.filter((c) => c.schoolId === schoolId).map((c) => ({ value: c.id, label: c.name })),
    [classes, schoolId]
  );
  const studentOptions = useMemo(
    () => students.filter((s) => s.schoolId === schoolId && (!classId || s.classId === classId)).map((s) => ({ value: s.id, label: s.name })),
    [students, schoolId, classId]
  );

  function toggle(list: string[], item: string) {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  async function saveLog() {
    try {
      setMsg("");
      const now = Date.now();
      const data = lessonLogSchema.parse({
        schoolId,
        classId,
        studentId,
        date: now,
        evolutionScore,
        needs,
        repertoire,
        plan: plan.trim()
      });

      const log: LessonLog = {
        id: uid("log"),
        ...data,
        createdAt: now,
        updatedAt: now
      };

      await db.lessonLogs.put(log);
      await enqueueChange({ entity: "lessonLog", entityId: log.id, op: "upsert", payload: log, updatedAt: now });

      setMsg("Registrado com sucesso!");
      // reset rápido mantendo escola/turma (pra aula coletiva)
      setStudentId("");
      setEvolutionScore(6);
      setNeeds([]);
      setRepertoire([]);
      setPlan("");
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Registrar Aula (rápido)">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Escola">
              <Select value={schoolId} onChange={(v) => { setSchoolId(v); setClassId(""); setStudentId(""); }} placeholder="Selecione..." options={schoolOptions} />
            </Field>
            <Field label="Turma">
              <Select value={classId} onChange={(v) => { setClassId(v); setStudentId(""); }} placeholder="Selecione..." options={classOptions} />
            </Field>
          </div>

          <Field label="Aluno">
            <Select value={studentId} onChange={setStudentId} placeholder="Selecione..." options={studentOptions} />
          </Field>

          <Field label={`Evolução (0–10): ${evolutionScore}`}>
            <input
              className="w-full"
              type="range"
              min={0}
              max={10}
              value={evolutionScore}
              onChange={(e) => setEvolutionScore(Number(e.target.value))}
            />
          </Field>

          <Field label="Necessidades (toques rápidos)">
            <TagPicker tags={NEED_TAGS} selected={needs} onToggle={(t) => setNeeds(toggle(needs, t))} />
          </Field>

          <Field label="Repertório/Ensaio (checklist)">
            <TagPicker tags={REPERTOIRE_SAMPLES} selected={repertoire} onToggle={(t) => setRepertoire(toggle(repertoire, t))} />
          </Field>

          <Field label="Plano de aula (curto)">
            <input className="input" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Ex: revisar base + exercício X + prática guiada" />
          </Field>

          {msg && <div className={`text-sm ${msg.includes("sucesso") ? "text-green-300" : "text-red-300"}`}>{msg}</div>}

          <Button className="w-full" onClick={saveLog} disabled={!schoolId || !classId || !studentId}>
            Salvar Registro
          </Button>

          <div className="text-xs text-zinc-500">
            Dica: em aula coletiva, selecione um aluno, registre, e repita. O app mantém escola/turma.
          </div>
        </div>
      </Card>
    </div>
  );
}