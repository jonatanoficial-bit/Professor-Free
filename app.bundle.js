(() => {
  // -------------------------
  // Utils
  // -------------------------
  const $ = (id) => document.getElementById(id);
  const toastEl = $("toast");

  function showToast(msg, ms = 1800) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.add("hidden"), ms);
  }

  function esc(s) {
    return String(s || "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function todayISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function typeLabel(t) {
    return ({ evolution:"Evolução", need:"Necessidade", repertoire:"Repertório", plan:"Plano" }[t] || t);
  }

  // -------------------------
  // Views
  // -------------------------
  const Views = {
    onboarding: $("viewOnboarding"),
    dashboard: $("viewDashboard"),
    schools: $("viewSchools"),
    classes: $("viewClasses"),
    students: $("viewStudents"),
    attendance: $("viewAttendance"),
    plans: $("viewPlans"),
    reports: $("viewReports"),
    quickNote: $("viewQuickNote"),
    ai: $("viewAI"),
    teacherEdit: $("viewTeacherEdit"),
  };

  function showView(key) {
    Object.keys(Views).forEach(k => Views[k]?.classList.add("hidden"));
    Views[key]?.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // -------------------------
  // Storage (localStorage) — robusto e offline
  // -------------------------
  const KEY = "teacher_assist_v1"; // mantém para não perder dados antigos

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function uid(prefix="id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function ensureState() {
    const st = loadState();
    if (st) {
      // migração segura: garante novas coleções
      st.schools = Array.isArray(st.schools) ? st.schools : [];
      st.classes = Array.isArray(st.classes) ? st.classes : [];
      st.students = Array.isArray(st.students) ? st.students : [];
      st.notes = Array.isArray(st.notes) ? st.notes : [];
      st.sessions = Array.isArray(st.sessions) ? st.sessions : [];
      st.plans = Array.isArray(st.plans) ? st.plans : [];
      saveState(st);
      return st;
    }
    const init = {
      teacher: null,
      schools: [],
      classes: [],
      students: [],
      notes: [],
      sessions: [], // chamadas (sessões)
      plans: []     // planos de aula
    };
    saveState(init);
    return init;
  }

  const DB = {
    getTeacher() { return ensureState().teacher; },
    setTeacher(data) {
      const st = ensureState();
      st.teacher = { ...st.teacher, ...data };
      saveState(st);
    },

    listSchools() { return ensureState().schools.slice(); },
    addSchool({ name, notes }) {
      const st = ensureState();
      const item = { id: uid("sch"), name, notes: notes || "" };
      st.schools.push(item);
      saveState(st);
      return item;
    },
    deleteSchool(id) {
      const st = ensureState();
      st.schools = st.schools.filter(s => s.id !== id);
      saveState(st);
    },

    listClasses() { return ensureState().classes.slice(); },
    addClass({ name, schoolId, schedule }) {
      const st = ensureState();
      const item = { id: uid("cls"), name, schoolId, schedule: schedule || "" };
      st.classes.push(item);
      saveState(st);
      return item;
    },
    deleteClass(id) {
      const st = ensureState();
      st.classes = st.classes.filter(c => c.id !== id);
      saveState(st);
    },

    listStudents() { return ensureState().students.slice(); },
    listStudentsByClass(classId) { return ensureState().students.filter(s => s.classId === classId); },
    addStudent({ name, classId, contact }) {
      const st = ensureState();
      const item = { id: uid("stu"), name, classId, contact: contact || "" };
      st.students.push(item);
      saveState(st);
      return item;
    },
    deleteStudent(id) {
      const st = ensureState();
      st.students = st.students.filter(s => s.id !== id);
      saveState(st);
    },

    addNote({ type, classId, studentId, text }) {
      const st = ensureState();
      const item = { id: uid("note"), type, classId, studentId: studentId || "", text: text || "", createdAt: Date.now() };
      st.notes.push(item);
      saveState(st);
      return item;
    },
    listLatestNotes(limit=10) {
      const st = ensureState();
      return st.notes.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0, limit);
    },
    listNotesByClass(classId, limit=20) {
      const st = ensureState();
      return st.notes.filter(n=>n.classId===classId).slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0, limit);
    },
    listNotesByStudent(studentId, limit=40) {
      const st = ensureState();
      return st.notes.filter(n=>n.studentId===studentId).slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0, limit);
    },

    // ---------- CHAMADA (SESSÕES) ----------
    createOrGetSession({ classId, dateISO }) {
      const st = ensureState();
      const existing = st.sessions.find(s => s.classId === classId && s.dateISO === dateISO);
      if (existing) return existing;

      const students = st.students.filter(x => x.classId === classId);
      const attendance = {};
      students.forEach(s => attendance[s.id] = "present"); // padrão: presente
      const session = {
        id: uid("ses"),
        classId,
        dateISO,
        createdAt: Date.now(),
        attendance
      };
      st.sessions.push(session);
      saveState(st);
      return session;
    },
    getLastSession(classId) {
      const st = ensureState();
      const sessions = st.sessions.filter(s => s.classId === classId).slice().sort((a,b)=>b.createdAt-a.createdAt);
      return sessions[0] || null;
    },
    listSessionsByClass(classId, limit=10) {
      const st = ensureState();
      return st.sessions.filter(s=>s.classId===classId).slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0, limit);
    },
    updateSession(sessionId, patch) {
      const st = ensureState();
      const i = st.sessions.findIndex(s => s.id === sessionId);
      if (i < 0) return;
      st.sessions[i] = { ...st.sessions[i], ...patch };
      saveState(st);
    },

    // ---------- PLANOS ----------
    addPlan({ classId, dateISO, title, objectives, activities, materials, homework }) {
      const st = ensureState();
      const plan = {
        id: uid("plan"),
        classId,
        dateISO,
        title,
        objectives: objectives || "",
        activities: activities || "",
        materials: materials || "",
        homework: homework || "",
        createdAt: Date.now()
      };
      st.plans.push(plan);
      saveState(st);
      return plan;
    },
    listPlansByClass(classId, limit=20) {
      const st = ensureState();
      return st.plans
        .filter(p => p.classId === classId)
        .slice()
        .sort((a,b)=> (b.dateISO||"").localeCompare(a.dateISO||"") || (b.createdAt-a.createdAt))
        .slice(0, limit);
    },
    listLatestPlans(limit=20) {
      const st = ensureState();
      return st.plans.slice().sort((a,b)=> (b.dateISO||"").localeCompare(a.dateISO||"") || (b.createdAt-a.createdAt)).slice(0, limit);
    },
    deletePlan(planId) {
      const st = ensureState();
      st.plans = st.plans.filter(p => p.id !== planId);
      saveState(st);
    },

    // ---------- Export / Import ----------
    exportAll() { return ensureState(); },
    importAll(payload) {
      if (!payload || typeof payload !== "object") throw new Error("invalid");
      const normalized = {
        teacher: payload.teacher || null,
        schools: Array.isArray(payload.schools) ? payload.schools : [],
        classes: Array.isArray(payload.classes) ? payload.classes : [],
        students: Array.isArray(payload.students) ? payload.students : [],
        notes: Array.isArray(payload.notes) ? payload.notes : [],
        sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
        plans: Array.isArray(payload.plans) ? payload.plans : []
      };
      saveState(normalized);
    }
  };

  // -------------------------
  // IA local (heurística simples + projeções)
  // -------------------------
  function runLocalAI(classId) {
    const classes = DB.listClasses();
    const cls = classes.find(c => c.id === classId);
    const notes = DB.listNotesByClass(classId, 9999);
    const students = DB.listStudentsByClass(classId);

    const now = Date.now();
    const last30 = notes.filter(n => n.createdAt >= now - 30*24*60*60*1000);
    const last14 = notes.filter(n => n.createdAt >= now - 14*24*60*60*1000);

    const counts = { evolution:0, need:0, repertoire:0, plan:0 };
    last30.forEach(n => { if (counts[n.type] !== undefined) counts[n.type]++; });

    const total = last30.length;
    const planRatio = total ? (counts.plan / total) : 0;
    const needRatio = total ? (counts.need / total) : 0;
    let health = 50;
    health += Math.min(25, total);
    health += Math.round(planRatio * 20);
    health -= Math.round(needRatio * 15);
    health = Math.max(0, Math.min(100, health));

    const needMap = new Map();
    last14.filter(n => n.type === "need" && n.studentId).forEach(n => {
      needMap.set(n.studentId, (needMap.get(n.studentId) || 0) + 1);
    });
    const topNeeds = [...needMap.entries()]
      .sort((a,b)=>b[1]-a[1])
      .slice(0, 5)
      .map(([sid, count]) => {
        const st = students.find(s => s.id === sid);
        return { student: st?.name || "Aluno", count };
      });

    const last7 = notes.filter(n => n.createdAt >= now - 7*24*60*60*1000);
    const prev7 = notes.filter(n => n.createdAt >= now - 14*24*60*60*1000 && n.createdAt < now - 7*24*60*60*1000);
    const trend = last7.length > prev7.length ? "Subindo" : (last7.length < prev7.length ? "Caindo" : "Estável");

    const suggestion = [];
    if (counts.plan === 0) suggestion.push("Criar um plano rápido para a próxima aula (objetivo + etapas).");
    if (counts.repertoire === 0) suggestion.push("Registrar repertório/exercícios praticados para manter histórico.");
    if (topNeeds.length) suggestion.push("Separar 5–10 min para trabalhar as necessidades dos alunos em alerta.");
    if (!suggestion.length) suggestion.push("Continue registrando notas rápidas; está bem equilibrado.");

    return {
      className: cls?.name || "Turma",
      generatedAt: new Date().toLocaleString("pt-BR"),
      last30Counts: counts,
      health,
      topNeeds,
      trend,
      suggestion
    };
  }

  // -------------------------
  // PWA (Install)
  // -------------------------
  let deferredPrompt = null;

  // -------------------------
  // Helpers de Select
  // -------------------------
  function fillClassSelect(selectEl, emptyText="Cadastre uma turma primeiro") {
    const classes = DB.listClasses();
    const schools = DB.listSchools();
    if (!classes.length) {
      selectEl.innerHTML = `<option value="">${esc(emptyText)}</option>`;
      return false;
    }
    selectEl.innerHTML = classes.map(c => {
      const sch = schools.find(s => s.id === c.schoolId);
      return `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(sch?.name || "Escola")}</option>`;
    }).join("");
    return true;
  }

  function fillSchoolSelect(selectEl, emptyText="Cadastre uma escola primeiro") {
    const schools = DB.listSchools();
    if (!schools.length) {
      selectEl.innerHTML = `<option value="">${esc(emptyText)}</option>`;
      return false;
    }
    selectEl.innerHTML = schools.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("");
    return true;
  }

  // -------------------------
  // Render: Dashboard
  // -------------------------
  async function renderDashboard() {
    const teacher = DB.getTeacher();
    $("helloTitle").textContent = `Olá, ${teacher?.name || "Professor(a)"}!`;
    $("helloSub").textContent = teacher?.email || teacher?.phone
      ? `Contato: ${teacher.email || ""}${teacher.email && teacher.phone ? " • " : ""}${teacher.phone || ""}`
      : "Organize turmas, alunos e anotações com poucos toques.";

    const latest = DB.listLatestNotes(10);
    const classes = DB.listClasses();
    const students = DB.listStudents();

    $("latestNotes").innerHTML = latest.map(n => {
      const cls = classes.find(c => c.id === n.classId);
      const st = n.studentId ? students.find(s => s.id === n.studentId) : null;
      return `
        <div class="item">
          <div class="item-title">${esc(typeLabel(n.type))} • ${esc(cls?.name || "Turma")}${st ? ` • ${esc(st.name)}` : ""}</div>
          <div class="item-sub">${esc(n.text || "(sem texto)")}<br><span class="muted">${esc(fmtDate(n.createdAt))}</span></div>
        </div>
      `;
    }).join("") || `<div class="muted">Nenhuma nota ainda. Use “+ Nota rápida”.</div>`;
  }

  // -------------------------
  // Render: Schools
  // -------------------------
  async function renderSchools() {
    const schools = DB.listSchools();
    const classes = DB.listClasses();

    const list = $("schoolsList");
    if (!schools.length) {
      list.innerHTML = `<div class="muted">Cadastre uma escola para começar.</div>`;
      return;
    }

    list.innerHTML = schools.map(s => {
      const count = classes.filter(c => c.schoolId === s.id).length;
      return `
        <div class="item">
          <div class="item-title">${esc(s.name)}</div>
          <div class="item-sub">
            ${s.notes ? esc(s.notes) + "<br>" : ""}
            <span class="badge"><strong>${count}</strong> turmas</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost" data-del-school="${esc(s.id)}">Excluir</button>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-del-school]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-school");
        const cnt = DB.listClasses().filter(c => c.schoolId === id).length;
        if (cnt > 0) return showToast("Não excluí: há turmas ligadas.");
        DB.deleteSchool(id);
        showToast("Escola removida.");
        renderSchools();
      });
    });
  }

  // -------------------------
  // Render: Classes
  // -------------------------
  async function renderClasses() {
    const schools = DB.listSchools();
    const classes = DB.listClasses();
    const students = DB.listStudents();

    fillSchoolSelect($("classSchoolSelect"));

    const list = $("classesList");
    if (!classes.length) {
      list.innerHTML = `<div class="muted">${schools.length ? "Nenhuma turma ainda." : "Cadastre uma escola e depois uma turma."}</div>`;
      return;
    }

    list.innerHTML = classes.map(c => {
      const sch = schools.find(s => s.id === c.schoolId);
      const count = students.filter(st => st.classId === c.id).length;
      return `
        <div class="item">
          <div class="item-title">${esc(c.name)}</div>
          <div class="item-sub">
            ${esc(sch?.name || "Escola")} ${c.schedule ? "• " + esc(c.schedule) : ""}<br>
            <span class="badge"><strong>${count}</strong> alunos</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost" data-open-att="${esc(c.id)}">Chamada</button>
            <button class="btn btn-ghost" data-open-quick="${esc(c.id)}">Nota rápida</button>
            <button class="btn btn-ghost" data-del-class="${esc(c.id)}">Excluir</button>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-open-quick]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await renderQuickNote(btn.getAttribute("data-open-quick"));
        showView("quickNote");
      });
    });

    list.querySelectorAll("[data-open-att]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await renderAttendance(btn.getAttribute("data-open-att"));
        showView("attendance");
      });
    });

    list.querySelectorAll("[data-del-class]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-class");
        const st = DB.listStudents().filter(s => s.classId === id).length;
        if (st > 0) return showToast("Não excluí: há alunos na turma.");
        DB.deleteClass(id);
        showToast("Turma removida.");
        renderClasses();
      });
    });
  }

  // -------------------------
  // Render: Students
  // -------------------------
  async function renderStudents() {
    fillClassSelect($("studentClassSelect"));

    const q = ($("studentSearch").value || "").trim().toLowerCase();
    const students = DB.listStudents();
    const classes = DB.listClasses();
    const schools = DB.listSchools();

    const filtered = q ? students.filter(s => s.name.toLowerCase().includes(q)) : students;

    const list = $("studentsList");
    if (!filtered.length) {
      list.innerHTML = `<div class="muted">${classes.length ? "Nenhum aluno encontrado." : "Cadastre uma turma e depois alunos."}</div>`;
      return;
    }

    list.innerHTML = filtered.map(s => {
      const cls = classes.find(c => c.id === s.classId);
      const sch = cls ? schools.find(sc => sc.id === cls.schoolId) : null;
      return `
        <div class="item">
          <div class="item-title">${esc(s.name)}</div>
          <div class="item-sub">
            ${esc(cls?.name || "Turma")} • ${esc(sch?.name || "Escola")}<br>
            ${s.contact ? esc(s.contact) : "<span class='muted'>Sem contato</span>"}
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost" data-open-report="${esc(s.id)}">Relatório</button>
            <button class="btn btn-ghost" data-open-quick-student="${esc(s.id)}">Registrar</button>
            <button class="btn btn-ghost" data-del-student="${esc(s.id)}">Excluir</button>
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-open-quick-student]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const studentId = btn.getAttribute("data-open-quick-student");
        const student = DB.listStudents().find(x => x.id === studentId);
        await renderQuickNote(student?.classId || "");
        await fillStudentsForQuickNote();
        $("quickStudentSelect").value = studentId;
        showView("quickNote");
      });
    });

    list.querySelectorAll("[data-open-report]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const studentId = btn.getAttribute("data-open-report");
        const st = DB.listStudents().find(x => x.id === studentId);
        await renderReports(st?.classId || "");
        if (st) $("repStudentSelect").value = st.id;
        await generateStudentReport();
        showView("reports");
      });
    });

    list.querySelectorAll("[data-del-student]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-student");
        DB.deleteStudent(id);
        showToast("Aluno removido.");
        renderStudents();
      });
    });
  }

  // -------------------------
  // Quick note
  // -------------------------
  async function renderQuickNote(preselectClassId = "") {
    const classes = DB.listClasses();
    const schools = DB.listSchools();
    const clsSel = $("quickClassSelect");

    if (!classes.length) {
      clsSel.innerHTML = `<option value="">Cadastre uma turma primeiro</option>`;
      $("quickStudentSelect").innerHTML = `<option value="">—</option>`;
      $("quickRecentNotes").innerHTML = `<div class="muted">Cadastre turmas para usar o modo aula.</div>`;
      return;
    }

    clsSel.innerHTML = classes.map(c => {
      const sch = schools.find(s => s.id === c.schoolId);
      return `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(sch?.name || "Escola")}</option>`;
    }).join("");

    if (preselectClassId) clsSel.value = preselectClassId;

    await fillStudentsForQuickNote();
    await renderQuickRecentNotes();
  }

  async function fillStudentsForQuickNote() {
    const classId = $("quickClassSelect").value;
    const st = classId ? DB.listStudentsByClass(classId) : [];
    const base = `<option value="">— Nota geral da turma —</option>`;
    $("quickStudentSelect").innerHTML = base + st.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("");
  }

  function currentNoteType() {
    const active = document.querySelector(".seg.active");
    return active ? active.getAttribute("data-type") : "evolution";
  }

  async function renderQuickRecentNotes() {
    const classId = $("quickClassSelect").value;
    const notes = classId ? DB.listNotesByClass(classId, 20) : [];
    const students = DB.listStudents();

    const box = $("quickRecentNotes");
    if (!notes.length) {
      box.innerHTML = `<div class="muted">Sem notas ainda. Registre durante a aula.</div>`;
      return;
    }

    box.innerHTML = notes.map(n => {
      const st = n.studentId ? students.find(s => s.id === n.studentId) : null;
      return `
        <div class="item">
          <div class="item-title">${esc(typeLabel(n.type))}${st ? ` • ${esc(st.name)}` : ""}</div>
          <div class="item-sub">${esc(n.text)}<br><span class="muted">${esc(fmtDate(n.createdAt))}</span></div>
        </div>
      `;
    }).join("");
  }

  // -------------------------
  // Attendance (Chamada)
  // -------------------------
  let currentSessionId = null;

  function statusLabel(s) {
    return ({ present:"Presente", absent:"Faltou", late:"Atraso" }[s] || s);
  }

  function toggleStatus(current) {
    if (current === "present") return "late";
    if (current === "late") return "absent";
    return "present";
  }

  async function renderAttendance(preselectClassId = "") {
    const ok = fillClassSelect($("attClassSelect"));
    $("attDate").value = todayISO();

    if (!ok) {
      $("attSessionBox").classList.add("hidden");
      $("attEmptyHelp").classList.remove("hidden");
      $("attEmptyHelp").textContent = "Cadastre uma turma e alunos para usar a chamada.";
      return;
    }

    if (preselectClassId) $("attClassSelect").value = preselectClassId;

    $("attSessionBox").classList.add("hidden");
    $("attEmptyHelp").classList.remove("hidden");
    $("attEmptyHelp").textContent = "Selecione uma turma e crie uma sessão para marcar presença.";
    currentSessionId = null;
  }

  async function openSession(session) {
    const classes = DB.listClasses();
    const cls = classes.find(c => c.id === session.classId);
    const students = DB.listStudentsByClass(session.classId);

    currentSessionId = session.id;

    $("attSessionTitle").textContent = `Sessão • ${cls?.name || "Turma"} • ${session.dateISO}`;
    $("attSessionBox").classList.remove("hidden");
    $("attEmptyHelp").classList.add("hidden");

    // lista de alunos com status clicável
    $("attList").innerHTML = students.map(st => {
      const s = session.attendance?.[st.id] || "present";
      return `
        <div class="item">
          <div class="att-row">
            <div>
              <div class="item-title">${esc(st.name)}</div>
              <div class="item-sub">Toque para alternar: Presente → Atraso → Faltou</div>
            </div>
            <div class="att-actions">
              <button class="btn btn-ghost" data-att-stu="${esc(st.id)}">${esc(statusLabel(s))}</button>
            </div>
          </div>
        </div>
      `;
    }).join("") || `<div class="muted">Sem alunos nessa turma.</div>`;

    // bind toggles
    $("attList").querySelectorAll("[data-att-stu]").forEach(btn => {
      btn.addEventListener("click", () => {
        const sid = btn.getAttribute("data-att-stu");
        const st = DB.exportAll();
        const ses = st.sessions.find(x => x.id === currentSessionId);
        if (!ses) return;

        const curr = ses.attendance?.[sid] || "present";
        const next = toggleStatus(curr);
        ses.attendance = ses.attendance || {};
        ses.attendance[sid] = next;
        saveState(st);

        btn.textContent = statusLabel(next);
      });
    });

    // histórico
    const hist = DB.listSessionsByClass(session.classId, 10);
    $("attHistory").innerHTML = hist.map(h => {
      const students2 = DB.listStudentsByClass(h.classId);
      const presentCount = students2.filter(s => (h.attendance?.[s.id] || "present") !== "absent").length;
      const total = students2.length;
      return `
        <div class="item">
          <div class="item-title">${esc(h.dateISO)}</div>
          <div class="item-sub">${total ? `${presentCount}/${total} presentes (presente+atraso)` : "Sem alunos"}</div>
        </div>
      `;
    }).join("") || `<div class="muted">Sem sessões ainda.</div>`;
  }

  function allAttendanceSet(value) {
    const st = DB.exportAll();
    const ses = st.sessions.find(x => x.id === currentSessionId);
    if (!ses) return;

    const students = st.students.filter(s => s.classId === ses.classId);
    ses.attendance = ses.attendance || {};
    students.forEach(s => ses.attendance[s.id] = value);
    saveState(st);
  }

  // -------------------------
  // Plans
  // -------------------------
  async function renderPlans(preselectClassId = "") {
    const ok = fillClassSelect($("planClassSelect"), "Cadastre uma turma primeiro");
    const classes = DB.listClasses();

    if (!ok) {
      $("plansList").innerHTML = `<div class="muted">Cadastre uma turma para criar planos.</div>`;
      return;
    }

    if (preselectClassId) $("planClassSelect").value = preselectClassId;

    const selectedClassId = $("planClassSelect").value || classes[0]?.id || "";
    const plans = selectedClassId ? DB.listPlansByClass(selectedClassId, 20) : [];

    $("plansList").innerHTML = plans.map(p => `
      <div class="item">
        <div class="item-title">${esc(p.dateISO)} • ${esc(p.title)}</div>
        <div class="item-sub">
          ${p.objectives ? `<strong>Objetivos:</strong> ${esc(p.objectives)}<br>` : ""}
          ${p.activities ? `<strong>Atividades:</strong> ${esc(p.activities)}<br>` : ""}
          ${p.materials ? `<strong>Materiais:</strong> ${esc(p.materials)}<br>` : ""}
          ${p.homework ? `<strong>Tarefa:</strong> ${esc(p.homework)}<br>` : ""}
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost" data-del-plan="${esc(p.id)}">Excluir</button>
        </div>
      </div>
    `).join("") || `<div class="muted">Nenhum plano ainda para esta turma.</div>`;

    $("plansList").querySelectorAll("[data-del-plan]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-plan");
        DB.deletePlan(id);
        showToast("Plano removido.");
        renderPlans($("planClassSelect").value);
      });
    });
  }

  // -------------------------
  // Reports
  // -------------------------
  async function renderReports(preselectClassId = "") {
    const ok = fillClassSelect($("repClassSelect"), "Cadastre uma turma primeiro");
    if (!ok) {
      $("repStudentSelect").innerHTML = `<option value="">Cadastre turma e alunos</option>`;
      $("reportOutput").innerHTML = `<div class="muted">Cadastre turma e alunos para gerar relatórios.</div>`;
      return;
    }

    if (preselectClassId) $("repClassSelect").value = preselectClassId;

    const classId = $("repClassSelect").value;
    const students = DB.listStudentsByClass(classId);
    $("repStudentSelect").innerHTML = students.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")
      || `<option value="">Sem alunos</option>`;

    $("reportOutput").innerHTML = `<div class="muted">Selecione aluno e clique em “Gerar relatório”.</div>`;
  }

  async function generateStudentReport() {
    const classId = $("repClassSelect").value;
    const studentId = $("repStudentSelect").value;
    if (!classId || !studentId) return showToast("Selecione turma e aluno.");

    const classes = DB.listClasses();
    const cls = classes.find(c => c.id === classId);
    const st = DB.listStudents().find(s => s.id === studentId);

    const notes = DB.listNotesByStudent(studentId, 30);
    const sessions = DB.listSessionsByClass(classId, 9999);

    // presença do aluno nas sessões da turma
    let present = 0, total = 0, absent = 0, late = 0;
    sessions.forEach(ses => {
      const status = ses.attendance?.[studentId];
      if (!status) return;
      total++;
      if (status === "absent") absent++;
      else if (status === "late") late++;
      else present++;
    });
    const presRate = total ? Math.round(((present + late) / total) * 100) : 0;

    const needs = notes.filter(n => n.type === "need").length;
    const evol = notes.filter(n => n.type === "evolution").length;
    const rep = notes.filter(n => n.type === "repertoire").length;
    const plan = notes.filter(n => n.type === "plan").length;

    const hint = [];
    if (total && presRate < 70) hint.push("Presença abaixo de 70%: considerar contato/ajuste de agenda.");
    if (needs > evol) hint.push("Mais necessidades que evolução: definir micro-metas e registrar progressos.");
    if (rep === 0) hint.push("Sem repertório registrado: adicionar exercícios/músicas praticadas.");
    if (!hint.length) hint.push("Bom acompanhamento. Continue registrando notas e chamadas.");

    $("reportOutput").innerHTML = `
      <div class="ai-box">
        <h3>${esc(st?.name || "Aluno")} • ${esc(cls?.name || "Turma")}</h3>
        <div class="item-sub">Gerado em ${esc(new Date().toLocaleString("pt-BR"))}</div>
      </div>

      <div class="ai-box">
        <h3>Presença</h3>
        <div class="item-sub">
          Taxa: <strong>${presRate}%</strong><br>
          Sessões registradas: <strong>${total}</strong><br>
          Presentes: <strong>${present}</strong> • Atrasos: <strong>${late}</strong> • Faltas: <strong>${absent}</strong>
        </div>
      </div>

      <div class="ai-box">
        <h3>Notas (últimas ${Math.min(30, notes.length)} registradas)</h3>
        <div class="item-sub">
          Evolução: <strong>${evol}</strong><br>
          Necessidade: <strong>${needs}</strong><br>
          Repertório: <strong>${rep}</strong><br>
          Plano: <strong>${plan}</strong>
        </div>
      </div>

      <div class="ai-box">
        <h3>Recomendações</h3>
        <div class="item-sub">${hint.map(x => `• ${esc(x)}`).join("<br>")}</div>
      </div>

      <div class="ai-box">
        <h3>Últimas notas</h3>
        ${notes.length ? notes.map(n => `
          <div class="item" style="margin-top:10px">
            <div class="item-title">${esc(typeLabel(n.type))} • ${esc(fmtDate(n.createdAt))}</div>
            <div class="item-sub">${esc(n.text)}</div>
          </div>
        `).join("") : `<div class="muted">Sem notas para este aluno.</div>`}
      </div>
    `;
    showToast("Relatório gerado.");
  }

  // -------------------------
  // AI view
  // -------------------------
  async function renderAI() {
    const sel = $("aiClassSelect");
    const ok = fillClassSelect(sel);
    $("aiOutput").innerHTML = ok
      ? `<div class="muted">Selecione uma turma e clique em “Gerar insights”.</div>`
      : `<div class="muted">Cadastre uma turma para usar a IA.</div>`;
  }

  async function onRunAI() {
    const classId = $("aiClassSelect").value;
    if (!classId) return showToast("Selecione uma turma.");
    $("aiOutput").innerHTML = `<div class="muted">Processando…</div>`;

    const res = runLocalAI(classId);
    const c = res.last30Counts;

    $("aiOutput").innerHTML = `
      <div class="ai-box">
        <h3>Resumo • ${esc(res.className)}</h3>
        <div class="item-sub">Gerado em ${esc(res.generatedAt)} • Tendência: <strong>${esc(res.trend)}</strong></div>
        <div class="item-sub" style="margin-top:8px">
          Saúde: <strong>${esc(String(res.health))}/100</strong>
        </div>
      </div>
      <div class="ai-box">
        <h3>Contagem (30 dias)</h3>
        <div class="item-sub">
          Evolução: <strong>${c.evolution}</strong><br>
          Necessidade: <strong>${c.need}</strong><br>
          Repertório: <strong>${c.repertoire}</strong><br>
          Plano: <strong>${c.plan}</strong>
        </div>
      </div>
      <div class="ai-box">
        <h3>Alertas (14 dias)</h3>
        ${res.topNeeds.length
          ? `<div class="item-sub">${res.topNeeds.map(x => `• ${esc(x.student)} — <strong>${x.count}</strong>`).join("<br>")}</div>`
          : `<div class="muted">Sem alertas fortes.</div>`}
      </div>
      <div class="ai-box">
        <h3>Sugestão para próxima aula</h3>
        <div class="item-sub">${res.suggestion.map(s => `• ${esc(s)}`).join("<br>")}</div>
      </div>
    `;
    showToast("Insights gerados.");
  }

  // -------------------------
  // Export / Import
  // -------------------------
  async function exportData() {
    const payload = DB.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-assist-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup exportado.");
  }

  async function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      DB.importAll(JSON.parse(txt));
      showToast("Importação concluída.");
      await renderDashboard();
      showView("dashboard");
    } catch {
      showToast("Arquivo inválido.");
    } finally {
      e.target.value = "";
    }
  }

  // -------------------------
  // Init + Bindings
  // -------------------------
  async function init() {
    // Install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $("btnInstall")?.classList.remove("hidden");
    });
    $("btnInstall")?.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      $("btnInstall")?.classList.add("hidden");
    });

    // Back
    document.querySelectorAll("[data-back]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await renderDashboard();
        showView("dashboard");
      });
    });

    // Export/Import
    $("btnExport")?.addEventListener("click", exportData);
    $("importFile")?.addEventListener("change", importData);

    // Nav
    $("goSchools")?.addEventListener("click", async () => { await renderSchools(); showView("schools"); });
    $("goClasses")?.addEventListener("click", async () => { await renderClasses(); showView("classes"); });
    $("goStudents")?.addEventListener("click", async () => { await renderStudents(); showView("students"); });
    $("goAttendance")?.addEventListener("click", async () => { await renderAttendance(); showView("attendance"); });
    $("goPlans")?.addEventListener("click", async () => { await renderPlans(); showView("plans"); });
    $("goReports")?.addEventListener("click", async () => { await renderReports(); showView("reports"); });
    $("goQuickNote")?.addEventListener("click", async () => { await renderQuickNote(); showView("quickNote"); });
    $("goAI")?.addEventListener("click", async () => { await renderAI(); showView("ai"); });

    // Teacher create
    $("formTeacher")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = String(fd.get("name")||"").trim();
      const email = String(fd.get("email")||"").trim();
      const phone = String(fd.get("phone")||"").trim();
      const schoolName = String(fd.get("school")||"").trim();
      const city = String(fd.get("city")||"").trim();
      if (!name) return showToast("Nome é obrigatório.");

      DB.setTeacher({ name, email, phone });

      if (schoolName) {
        const exists = DB.listSchools().some(s => s.name.toLowerCase() === schoolName.toLowerCase());
        if (!exists) DB.addSchool({ name: schoolName, notes: city ? `Cidade: ${city}` : "" });
      }

      showToast("Cadastro salvo!");
      await renderDashboard();
      showView("dashboard");
    });

    // Edit teacher
    $("btnEditTeacher")?.addEventListener("click", async () => {
      const t = DB.getTeacher();
      const f = $("formTeacherEdit");
      if (!f) return;
      f.name.value = t?.name || "";
      f.email.value = t?.email || "";
      f.phone.value = t?.phone || "";
      showView("teacherEdit");
    });

    $("formTeacherEdit")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = String(fd.get("name")||"").trim();
      const email = String(fd.get("email")||"").trim();
      const phone = String(fd.get("phone")||"").trim();
      if (!name) return showToast("Nome é obrigatório.");
      DB.setTeacher({ name, email, phone });
      showToast("Atualizado.");
      await renderDashboard();
      showView("dashboard");
    });

    // Add school
    $("formSchool")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = String(fd.get("name")||"").trim();
      const notes = String(fd.get("notes")||"").trim();
      if (!name) return showToast("Nome obrigatório.");
      DB.addSchool({ name, notes });
      ev.target.reset();
      showToast("Escola adicionada.");
      renderSchools();
    });

    // Add class
    $("formClass")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = String(fd.get("name")||"").trim();
      const schoolId = String(fd.get("schoolId")||"");
      const schedule = String(fd.get("schedule")||"").trim();
      if (!name) return showToast("Nome obrigatório.");
      if (!schoolId) return showToast("Selecione uma escola.");
      DB.addClass({ name, schoolId, schedule });
      ev.target.reset();
      showToast("Turma adicionada.");
      renderClasses();
    });

    // Add student
    $("formStudent")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = String(fd.get("name")||"").trim();
      const classId = String(fd.get("classId")||"");
      const contact = String(fd.get("contact")||"").trim();
      if (!name) return showToast("Nome obrigatório.");
      if (!classId) return showToast("Selecione uma turma.");
      DB.addStudent({ name, classId, contact });
      ev.target.reset();
      showToast("Aluno adicionado.");
      renderStudents();
    });

    // Search students
    $("studentSearch")?.addEventListener("input", () => renderStudents());

    // Quick type
    $("noteTypeSegment")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-type]");
      if (!btn) return;
      document.querySelectorAll(".seg").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
    });

    // Quick select changes
    $("quickClassSelect")?.addEventListener("change", async () => {
      await fillStudentsForQuickNote();
      await renderQuickRecentNotes();
    });

    // Save note
    $("btnSaveQuickNote")?.addEventListener("click", async () => {
      const classId = $("quickClassSelect").value;
      if (!classId) return showToast("Selecione uma turma.");
      const studentId = $("quickStudentSelect").value || "";
      const type = currentNoteType();
      const text = String($("quickText").value || "").trim();
      if (!text) return showToast("Escreva algo.");
      DB.addNote({ type, classId, studentId, text });
      $("quickText").value = "";
      showToast("Nota salva.");
      await renderQuickRecentNotes();
      await renderDashboard();
    });

    // AI
    $("btnRunAI")?.addEventListener("click", onRunAI);

    // ----------- Attendance bindings -----------
    $("attClassSelect")?.addEventListener("change", () => {
      currentSessionId = null;
      $("attSessionBox").classList.add("hidden");
      $("attEmptyHelp").classList.remove("hidden");
      $("attEmptyHelp").textContent = "Selecione uma turma e crie uma sessão para marcar presença.";
    });

    $("btnCreateSession")?.addEventListener("click", () => {
      const classId = $("attClassSelect").value;
      if (!classId) return showToast("Selecione uma turma.");
      const dateISO = $("attDate").value || todayISO();
      const session = DB.createOrGetSession({ classId, dateISO });
      openSession(session);
      showToast("Sessão aberta.");
    });

    $("btnOpenLastSession")?.addEventListener("click", () => {
      const classId = $("attClassSelect").value;
      if (!classId) return showToast("Selecione uma turma.");
      const last = DB.getLastSession(classId);
      if (!last) return showToast("Nenhuma sessão ainda.");
      openSession(last);
    });

    $("btnAllPresent")?.addEventListener("click", () => {
      if (!currentSessionId) return showToast("Abra uma sessão primeiro.");
      allAttendanceSet("present");
      showToast("Todos presentes.");
      const st = DB.exportAll();
      openSession(st.sessions.find(s => s.id === currentSessionId));
    });

    $("btnAllAbsent")?.addEventListener("click", () => {
      if (!currentSessionId) return showToast("Abra uma sessão primeiro.");
      allAttendanceSet("absent");
      showToast("Todos faltaram.");
      const st = DB.exportAll();
      openSession(st.sessions.find(s => s.id === currentSessionId));
    });

    $("btnSaveSession")?.addEventListener("click", () => {
      if (!currentSessionId) return showToast("Nada para salvar.");
      showToast("Chamada salva.");
    });

    // ----------- Plans bindings -----------
    $("planClassSelect")?.addEventListener("change", () => renderPlans($("planClassSelect").value));

    $("formPlan")?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const classId = String(fd.get("classId")||"");
      const dateISO = String(fd.get("date")||"");
      const title = String(fd.get("title")||"").trim();
      const objectives = String(fd.get("objectives")||"").trim();
      const activities = String(fd.get("activities")||"").trim();
      const materials = String(fd.get("materials")||"").trim();
      const homework = String(fd.get("homework")||"").trim();

      if (!classId) return showToast("Selecione uma turma.");
      if (!dateISO) return showToast("Selecione a data.");
      if (!title) return showToast("Título é obrigatório.");

      DB.addPlan({ classId, dateISO, title, objectives, activities, materials, homework });
      ev.target.reset();
      showToast("Plano salvo.");
      renderPlans(classId);
    });

    // ----------- Reports bindings -----------
    $("repClassSelect")?.addEventListener("change", () => renderReports($("repClassSelect").value));
    $("btnGenerateReport")?.addEventListener("click", generateStudentReport);

    // Start
    const teacher = DB.getTeacher();
    if (!teacher) showView("onboarding");
    else { await renderDashboard(); showView("dashboard"); }

    showToast("Carregado ✅", 900);
  }

  // Escudo
  window.addEventListener("error", () => { try { showView("onboarding"); } catch {} });
  window.addEventListener("unhandledrejection", () => { try { showView("onboarding"); } catch {} });

  init();
})();