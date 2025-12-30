import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Select from "../components/Select";
import Field from "../components/Field";
import { db } from "../lib/db";
import { buildInsights } from "../lib/ia";
import type { Student, School, ClassGroup, LessonLog, Insights as InsightType } from "../types/models";

export default function Insights() {
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<LessonLog[]>([]);

  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");

  useEffect(() => {
    (async () => {
      setSchools(await db.schools.orderBy("updatedAt").reverse().toArray());
      setClasses(await db.classes.orderBy("updatedAt").reverse().toArray());
      setStudents(await db.students.orderBy("updatedAt").reverse().toArray());
      setLogs(await db.lessonLogs.orderBy("date").reverse().toArray());
    })();
  }, []);

  const schoolOptions = useMemo(() => schools.map((s) => ({ value: s.id, label: s.name })), [schools]);
  const classOptions = useMemo(
    () => classes.filter((c) => c.schoolId === schoolId).map((c) => ({ value: c.id, label: c.name })),
    [classes, schoolId]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (schoolId && s.schoolId !== schoolId) return false;
      if (classId && s.classId !== classId) return false;
      return true;
    });
  }, [students, schoolId, classId]);

  const insights: InsightType[] = useMemo(() => {
    const byStudent: Record<string, LessonLog[]> = {};
    for (const l of logs) {
      if (schoolId && l.schoolId !== schoolId) continue;
      if (classId && l.classId !== classId) continue;
      (byStudent[l.studentId] ||= []).push(l);
    }
    return filteredStudents.map((st) => buildInsights(st.id, byStudent[st.id] || []));
  }, [logs, filteredStudents, schoolId, classId]);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  return (
    <div className="space-y-4">
      <Card title="Insights (IA local, sem API externa)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Escola (filtro)">
            <Select value={schoolId} onChange={(v) => { setSchoolId(v); setClassId(""); }} placeholder="Todas" options={schoolOptions} />
          </Field>
          <Field label="Turma (filtro)">
            <Select value={classId} onChange={setClassId} placeholder="Todas" options={classOptions} />
          </Field>
        </div>

        <div className="mt-4 space-y-3">
          {insights.length === 0 ? (
            <div className="text-sm text-zinc-400">Sem dados para gerar insights.</div>
          ) : (
            insights.map((i) => (
              <div key={i.studentId} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{studentMap.get(i.studentId) || "Aluno"}</div>
                    <div className="text-xs text-zinc-400">
                      Tendência: <b>{i.trend}</b> • Projeção: <b>{i.projectedScore}</b>/10 • Risco: <b>{i.risk}</b>
                    </div>
                    <div className="text-sm text-zinc-200 mt-2">{i.suggestion}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-xs text-zinc-500 mt-3">
          Observação: este módulo é propositalmente simples e robusto (regras + estatística) para não depender de custos externos.
        </div>
      </Card>
    </div>
  );
}