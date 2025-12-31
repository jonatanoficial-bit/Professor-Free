/* IndexedDB layer (offline-first, sem quebrar) */
const DB_NAME = "teacher_assist_db";
const DB_VERSION = 1;

const Stores = {
  TEACHER: "teacher",
  SCHOOLS: "schools",
  CLASSES: "classes",
  STUDENTS: "students",
  NOTES: "notes"
};

function id() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = req.result;

      if (!db.objectStoreNames.contains(Stores.TEACHER)) {
        db.createObjectStore(Stores.TEACHER, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(Stores.SCHOOLS)) {
        const st = db.createObjectStore(Stores.SCHOOLS, { keyPath: "id" });
        st.createIndex("by_name", "name", { unique: false });
      }
      if (!db.objectStoreNames.contains(Stores.CLASSES)) {
        const st = db.createObjectStore(Stores.CLASSES, { keyPath: "id" });
        st.createIndex("by_schoolId", "schoolId", { unique: false });
        st.createIndex("by_name", "name", { unique: false });
      }
      if (!db.objectStoreNames.contains(Stores.STUDENTS)) {
        const st = db.createObjectStore(Stores.STUDENTS, { keyPath: "id" });
        st.createIndex("by_classId", "classId", { unique: false });
        st.createIndex("by_name", "name", { unique: false });
      }
      if (!db.objectStoreNames.contains(Stores.NOTES)) {
        const st = db.createObjectStore(Stores.NOTES, { keyPath: "id" });
        st.createIndex("by_classId", "classId", { unique: false });
        st.createIndex("by_studentId", "studentId", { unique: false });
        st.createIndex("by_createdAt", "createdAt", { unique: false });
        st.createIndex("by_type", "type", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);

    let out;
    try { out = fn(store, t); } catch (e) { reject(e); }

    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}

const DB = {
  async getTeacher() {
    const res = await tx(Stores.TEACHER, "readonly", (s) => s.get("profile"));
    return new Promise((resolve) => {
      res.onsuccess = () => resolve(res.result ? res.result.value : null);
      res.onerror = () => resolve(null);
    });
  },

  async setTeacher(profile) {
    const payload = { key: "profile", value: profile, updatedAt: Date.now() };
    const res = await tx(Stores.TEACHER, "readwrite", (s) => s.put(payload));
    return new Promise((resolve, reject) => {
      res.onsuccess = () => resolve(true);
      res.onerror = () => reject(res.error);
    });
  },

  async addSchool({ name, notes = "" }) {
    const item = { id: id(), name: name.trim(), notes: notes.trim(), createdAt: Date.now() };
    const res = await tx(Stores.SCHOOLS, "readwrite", (s) => s.add(item));
    return new Promise((resolve, reject) => {
      res.onsuccess = () => resolve(item);
      res.onerror = () => reject(res.error);
    });
  },

  async listSchools() {
    const res = await tx(Stores.SCHOOLS, "readonly", (s) => s.getAll());
    return new Promise((resolve) => {
      res.onsuccess = () => resolve((res.result || []).sort((a,b)=>a.name.localeCompare(b.name)));
      res.onerror = () => resolve([]);
    });
  },

  async deleteSchool(schoolId) {
    // Não apaga em cascata para não quebrar dados; valida antes no app
    const res = await tx(Stores.SCHOOLS, "readwrite", (s) => s.delete(schoolId));
    return new Promise((resolve) => {
      res.onsuccess = () => resolve(true);
      res.onerror = () => resolve(false);
    });
  },

  async addClass({ name, schoolId, schedule = "" }) {
    const item = { id: id(), name: name.trim(), schoolId, schedule: schedule.trim(), createdAt: Date.now() };
    const res = await tx(Stores.CLASSES, "readwrite", (s) => s.add(item));
    return new Promise((resolve, reject) => {
      res.onsuccess = () => resolve(item);
      res.onerror = () => reject(res.error);
    });
  },

  async listClasses() {
    const res = await tx(Stores.CLASSES, "readonly", (s) => s.getAll());
    return new Promise((resolve) => {
      res.onsuccess = () => resolve((res.result || []).sort((a,b)=>a.name.localeCompare(b.name)));
      res.onerror = () => resolve([]);
    });
  },

  async countClassesBySchool(schoolId) {
    const res = await tx(Stores.CLASSES, "readonly", (s) => s.index("by_schoolId").getAll(schoolId));
    return new Promise((resolve) => {
      res.onsuccess = () => resolve((res.result || []).length);
      res.onerror = () => resolve(0);
    });
  },

  async deleteClass(classId) {
    const res = await tx(Stores.CLASSES, "readwrite", (s) => s.delete(classId));
    return new Promise((resolve) => {
      res.onsuccess = () => resolve(true);
      res.onerror = () => resolve(false);
    });
  },

  async addStudent({ name, classId, contact = "" }) {
    const item = { id: id(), name: name.trim(), classId, contact: contact.trim(), createdAt: Date.now() };
    const res = await tx(Stores.STUDENTS, "readwrite", (s) => s.add(item));
    return new Promise((resolve, reject) => {
      res.onsuccess = () => resolve(item);
      res.onerror = () => reject(res.error);
    });
  },

  async listStudents() {
    const res = await tx(Stores.STUDENTS, "readonly", (s) => s.getAll());
    return new Promise((resolve) => {
      res.onsuccess = () => resolve((res.result || []).sort((a,b)=>a.name.localeCompare(b.name)));
      res.onerror = () => resolve([]);
    });
  },

  async listStudentsByClass(classId) {
    const res = await tx(Stores.STUDENTS, "readonly", (s) => s.index("by_classId").getAll(classId));
    return new Promise((resolve) => {
      res.onsuccess = () => resolve((res.result || []).sort((a,b)=>a.name.localeCompare(b.name)));
      res.onerror = () => resolve([]);
    });
  },

  async deleteStudent(studentId) {
    const res = await tx(Stores.STUDENTS, "readwrite", (s) => s.delete(studentId));
    return new Promise((resolve) => {
      res.onsuccess = () => resolve(true);
      res.onerror = () => resolve(false);
    });
  },

  async addNote({ type, classId, studentId = "", text }) {
    const item = {
      id: id(),
      type,
      classId,
      studentId: studentId || "",
      text: (text || "").trim(),
      createdAt: Date.now()
    };
    const res = await tx(Stores.NOTES, "readwrite", (s) => s.add(item));
    return new Promise((resolve, reject) => {
      res.onsuccess = () => resolve(item);
      res.onerror = () => reject(res.error);
    });
  },

  async listLatestNotes(limit = 10) {
    const res = await tx(Stores.NOTES, "readonly", (s) => s.getAll());
    return new Promise((resolve) => {
      res.onsuccess = () => {
        const arr = res.result || [];
        arr.sort((a,b)=>b.createdAt - a.createdAt);
        resolve(arr.slice(0, limit));
      };
      res.onerror = () => resolve([]);
    });
  },

  async listNotesByClass(classId, limit = 30) {
    const res = await tx(Stores.NOTES, "readonly", (s) => s.index("by_classId").getAll(classId));
    return new Promise((resolve) => {
      res.onsuccess = () => {
        const arr = res.result || [];
        arr.sort((a,b)=>b.createdAt - a.createdAt);
        resolve(arr.slice(0, limit));
      };
      res.onerror = () => resolve([]);
    });
  },

  async exportAll() {
    const teacher = await this.getTeacher();
    const schools = await this.listSchools();
    const classes = await this.listClasses();
    const students = await this.listStudents();
    const notes = await tx(Stores.NOTES, "readonly", (s)=>s.getAll());
    const notesArr = await new Promise((resolve)=> {
      notes.onsuccess = ()=> resolve(notes.result || []);
      notes.onerror = ()=> resolve([]);
    });

    return {
      meta: { app: "Teacher Assist", version: 1, exportedAt: new Date().toISOString() },
      teacher,
      schools,
      classes,
      students,
      notes: notesArr
    };
  },

  async importAll(payload) {
    // Import seguro: valida estrutura básica e insere em transações separadas
    if (!payload || typeof payload !== "object") throw new Error("Arquivo inválido.");

    const teacher = payload.teacher || null;
    const schools = Array.isArray(payload.schools) ? payload.schools : [];
    const classes = Array.isArray(payload.classes) ? payload.classes : [];
    const students = Array.isArray(payload.students) ? payload.students : [];
    const notes = Array.isArray(payload.notes) ? payload.notes : [];

    if (teacher) {
      await this.setTeacher(teacher);
    }

    // Inserção: sobrescreve por id (put) para evitar duplicar / quebrar
    await tx(Stores.SCHOOLS, "readwrite", (s)=> { schools.forEach(x=> s.put(x)); });
    await tx(Stores.CLASSES, "readwrite", (s)=> { classes.forEach(x=> s.put(x)); });
    await tx(Stores.STUDENTS, "readwrite", (s)=> { students.forEach(x=> s.put(x)); });
    await tx(Stores.NOTES, "readwrite", (s)=> { notes.forEach(x=> s.put(x)); });

    return true;
  }
};