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
  const KEY = "teacher_assist_v1";

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
    if (st) return st;
    const init = {
      teacher: null,
      schools: [],
      classes: [],
      students: [],
      notes: []
    };
    saveState(init);
    return init;
  }

  const DB = {
    getTeacher() {
      return ensureState().teacher;
    },
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
    listStudentsByClass(classId) {
      return ensureState().students.filter(s => s.classId === classId);
    },
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
      const item = {
        id: uid("note"),
        type,
        classId,
        studentId: studentId || "",
        text: text || "",
        createdAt: Date.now()
      };
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
      return st.notes
        .filter(n => n.classId === classId)
        .slice()
        .sort((a,b)=>b.createdAt-a.createdAt)
        .slice(0, limit);
    },

    exportAll() {
      return ensureState();
    },
    importAll(payload) {
      if (!payload || typeof payload !== "object") throw new Error("invalid");
      const normalized = {
        teacher: payload.teacher || null,
        schools: Array.isArray(payload.schools) ? payload.schools : [],
        classes: Array.isArray(payload.classes) ? payload.classes : [],
        students: Array.isArray(payload.students) ? payload.students : [],
        notes: Array.isArray(payload.notes) ? payload.notes : []
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

    // “Saúde” simples: equilíbrio de registros e presença de plano
    const total = last30.length;
    const planRatio = total ? (counts.plan / total) : 0;
    const needRatio = total ? (counts.need / total) : 0;
    let health = 50;
    health += Math.min(25, total);                 // mais registros = melhor
    health += Math.round(planRatio * 20);          // ter plano ajuda
    health -= Math.round(needRatio * 15);          // muitas “necessidades” sem evolução pode reduzir
    health = Math.max(0, Math.min(100, health));

    // Top necessidades por aluno
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

    // Tendência (muito simples)
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
  // PWA (SW + install)
  // -------------------------
  let deferredPrompt = null;

  async function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
    } catch (e) {
      console.warn("SW fail:", e);
    }
  }

  // -------------------------
  // Render
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

  function fillSchoolSelect(selectEl) {
    const schools = DB.listSchools();
    if (!schools.length) {
      selectEl.innerHTML = `<option value="">Cadastre uma escola primeiro</option>`;
      return false;
    }
    selectEl.innerHTML = schools.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("");
    return true;
  }

  async function renderClasses() {
    const schools = DB.listSchools();
    const classes = DB.listClasses();
    const students = DB.listStudents();

    const ok = fillSchoolSelect($("classSchoolSelect"));

    const list = $("classesList");
    if (!classes.length) {
      list.innerHTML = `<div class="muted">${ok ? "Nenhuma turma ainda." : "Cadastre uma escola e depois uma turma."}</div>`;
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
            <button class="btn btn-ghost" data-open-quick="${esc(c.id)}">Modo aula</button>
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
    list.querySelectorAll("[data-del-class]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-class");
        const st = DB.listStudents().filter(s => s.classId === id).length;
        if (st > 0) return showToast("Não excluí: há alunos na turma.");
        DB.deleteClass(id);
        showToast("Turma removida.");
        renderClasses();
      });
    });
  }

  function fillClassSelect(selectEl) {
    const classes = DB.listClasses();
    const schools = DB.listSchools();
    if (!classes.length) {
      selectEl.innerHTML = `<option value="">Cadastre uma turma primeiro</option>`;
      return false;
    }
    selectEl.innerHTML = classes.map(c => {
      const sch = schools.find(s => s.id === c.schoolId);
      return `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(sch?.name || "Escola")}</option>`;
    }).join("");
    return true;
  }

  async function renderStudents() {
    const ok = fillClassSelect($("studentClassSelect"));

    const q = ($("studentSearch").value || "").trim().toLowerCase();
    const students = DB.listStudents();
    const classes = DB.listClasses();
    const schools = DB.listSchools();

    const filtered = q ? students.filter(s => s.name.toLowerCase().includes(q)) : students;

    const list = $("studentsList");
    if (!filtered.length) {
      list.innerHTML = `<div class="muted">${ok ? "Nenhum aluno encontrado." : "Cadastre uma turma e depois alunos."}</div>`;
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

    list.querySelectorAll("[data-del-student]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-student");
        DB.deleteStudent(id);
        showToast("Aluno removido.");
        renderStudents();
      });
    });
  }

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
    await registerSW();

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

      // cria escola inicial se informada
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

    // Start
    const teacher = DB.getTeacher();
    if (!teacher) showView("onboarding");
    else { await renderDashboard(); showView("dashboard"); }

    showToast("Carregado ✅", 1000);
  }

  // Escudo: se JS quebrar por algum motivo, mostra onboarding
  window.addEventListener("error", () => {
    try { showView("onboarding"); } catch {}
  });
  window.addEventListener("unhandledrejection", () => {
    try { showView("onboarding"); } catch {}
  });

  init();
})();