export type ID = string;

export type ProfessorProfile = {
  id: ID;
  name: string;
  email: string;
  phone: string;
  mainInstitution?: string;
  createdAt: number;
  updatedAt: number;
};

export type School = {
  id: ID;
  name: string;
  address?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type ClassGroup = {
  id: ID;
  schoolId: ID;
  name: string; // ex: "2º Ano B", "Turma Violão Iniciante"
  schedule?: string; // ex: "Seg/Qua 19:00"
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type Student = {
  id: ID;
  schoolId: ID;
  classId?: ID;
  name: string;
  contact?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type LessonLog = {
  id: ID;
  schoolId: ID;
  classId: ID;
  studentId: ID;
  date: number; // timestamp
  evolutionScore: number; // 0..10
  needs: string[]; // tags
  repertoire: string[]; // checklist simples
  plan: string; // texto
  createdAt: number;
  updatedAt: number;
};

export type SyncChange = {
  id: ID;
  entity: "professor" | "school" | "class" | "student" | "lessonLog";
  entityId: ID;
  op: "upsert" | "delete";
  payload: any;
  updatedAt: number;
};

export type Insights = {
  studentId: ID;
  trend: "up" | "down" | "flat";
  projectedScore: number; // 0..10
  risk: "low" | "medium" | "high";
  suggestion: string;
};