import Dexie, { Table } from "dexie";
import type { ProfessorProfile, School, ClassGroup, Student, LessonLog, SyncChange } from "../types/models";

export class AppDB extends Dexie {
  professor!: Table<ProfessorProfile, string>;
  schools!: Table<School, string>;
  classes!: Table<ClassGroup, string>;
  students!: Table<Student, string>;
  lessonLogs!: Table<LessonLog, string>;
  syncQueue!: Table<SyncChange, string>;
  kv!: Table<{ key: string; value: any }, string>;

  constructor() {
    super("professorPocketDB");
    this.version(1).stores({
      professor: "id, updatedAt",
      schools: "id, updatedAt",
      classes: "id, schoolId, updatedAt",
      students: "id, schoolId, classId, updatedAt",
      lessonLogs: "id, schoolId, classId, studentId, date, updatedAt",
      syncQueue: "id, entity, entityId, updatedAt",
      kv: "key"
    });
  }
}

export const db = new AppDB();

export function uid(prefix = "id"): string {
  const rnd = Math.random().toString(16).slice(2);
  const ts = Date.now().toString(16);
  return `${prefix}_${ts}_${rnd}`;
}

export async function getServerUrl(): Promise<string> {
  const row = await db.kv.get("serverUrl");
  return (row?.value as string) || "";
}

export async function setServerUrl(url: string): Promise<void> {
  await db.kv.put({ key: "serverUrl", value: url.trim() });
}

export async function getAuthToken(): Promise<string> {
  const row = await db.kv.get("authToken");
  return (row?.value as string) || "";
}

export async function setAuthToken(token: string): Promise<void> {
  await db.kv.put({ key: "authToken", value: token });
}

export async function clearAuthToken(): Promise<void> {
  await db.kv.delete("authToken");
}