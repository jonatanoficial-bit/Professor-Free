/* App Controller (UI + fluxo + integrações) */

let deferredPrompt = null;

const Views = {
  onboarding: document.getElementById("viewOnboarding"),
  dashboard: document.getElementById("viewDashboard"),
  schools: document.getElementById("viewSchools"),
  classes: document.getElementById("viewClasses"),
  students: document.getElementById("viewStudents"),
  quickNote: document.getElementById("viewQuickNote"),
  ai: document.getElementById("viewAI"),
  teacherEdit: document.getElementById("viewTeacherEdit")
};

const toastEl = document.getElementById("toast");

function showToast(msg, ms=1900){
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toastEl.classList.add("hidden"), ms);
}

function showView(key){
  Object.keys(Views).forEach(k => Views[k].classList.add("hidden"));
  Views[key].classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function typeLabel(t){
  return ({evolution:"Evolução", need:"Necessidade", repertoire:"Repertório", plan:"Plano"}[t] || t);
}
function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle:"short" });
}

function esc(s){
  return String(s || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function init(){
  // Service Worker
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (e) {
      // Não quebra o app
      console.warn("SW falhou:", e);
    }
  }

  // Install prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById("btnInstall").classList.remove("hidden");
  });

  document.getElementById("btnInstall").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById("btnInstall").classList.add("hidden");
  });

  // Back buttons
  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => showView("dashboard"));
  });

  // Export / Import
  document.getElementById("btnExport").addEventListener("click", exportData);
  document.getElementById("importFile").addEventListener("change", importData);

  // Dashboard nav
  document.getElementById("goSchools").addEventListener("click", async ()=> { await renderSchools(); showView("schools"); });
  document.getElementById("goClasses").addEventListener("click", async ()=> { await renderClasses(); showView("classes"); });
  document.getElementById("goStudents").addEventListener("click", async ()=> { await renderStudents(); showView("students"); });
  document.getElementById("goQuickNote").addEventListener("click", async ()=> { await renderQuickNote(); showView("quickNote"); });
  document.getElementById("goAI").addEventListener("click", async ()=> { await renderAI(); showView("ai"); });

  // Teacher forms
  document.getElementById("formTeacher").addEventListener("submit", onSaveTeacher);
  document.getElementById("btnEditTeacher").addEventListener("click", async ()=>{
    const t = await DB.getTeacher();
    const f = document.getElementById("formTeacherEdit");
    f.name.value = t?.name || "";
    f.email.value = t?.email || "";
    f.phone.value = t?.phone || "";
    showView("teacherEdit");
  });
  document.getElementById("formTeacherEdit").addEventListener("submit", onEditTeacher);

  // School/Class/Student forms
  document.getElementById("formSchool").addEventListener("submit", onAddSchool);
  document.getElementById("formClass").addEventListener("submit", onAddClass);
  document.getElementById("formStudent").addEventListener("submit", onAddStudent);

  // Student search
  document.getElementById("studentSearch").addEventListener("input", () => renderStudents());

  // Quick note types
  document.getElementById("noteTypeSegment").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-type]");
    if(!btn) return;
    document.querySelectorAll(".seg").forEach(s=> s.classList.remove("active"));
    btn.classList.add("active");
  });

  // Quick note select changes
  document.getElementById("quickClassSelect").addEventListener("change", async ()=> {
    await fillStudentsForQuickNote();
    await renderQuickRecentNotes();
  });

  // Save quick note
  document.getElementById("btnSaveQuickNote").addEventListener("click", onSaveQuickNote);

  // AI
  document.getElementById("btnRunAI").addEventListener("click", onRunAI);

  // Start
  const teacher = await DB.getTeacher();
  if (!teacher) {
    showView("onboarding");
  } else {
    await renderDashboard();
    showView("dashboard");
  }
}

async function onSaveTeacher(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = (fd.get("name") || "").toString().trim();
  const email = (fd.get("email") || "").toString().trim();
  const phone = (fd.get("phone") || "").toString().trim();
  const schoolName = (fd.get("school") || "").toString().trim();
  const city = (fd.get("city") || "").toString().trim();

  if(!name) return showToast("Nome é obrigatório.");

  await DB.setTeacher({ name, email, phone });

  // Se informou escola principal, cria escola automaticamente
  if (schoolName) {
    const schools = await DB.listSchools();
    const exists = schools.some(s => s.name.toLowerCase() === schoolName.toLowerCase());
    if (!exists) await DB.addSchool({ name: schoolName, notes: city ? `Cidade: ${city}` : "" });
  }

  showToast("Cadastro salvo!");
  await renderDashboard();
  showView("dashboard");
}

async function onEditTeacher(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = (fd.get("name") || "").toString().trim();
  const email = (fd.get("email") || "").toString().trim();
  const phone = (fd.get("phone") || "").toString().trim();
  if(!name) return showToast("Nome é obrigatório.");

  await DB.setTeacher({ name, email, phone });
  showToast("Atualizado.");
  await renderDashboard();
  showView("dashboard");
}

async function renderDashboard(){
  const teacher = await DB.getTeacher();
  document.getElementById("helloTitle").textContent = `Olá, ${teacher?.name || "Professor(a)"}!`;
  document.getElementById("helloSub").textContent = teacher?.email || teacher?.phone
    ? `Contato: ${teacher.email || ""}${teacher.email && teacher.phone ? " • " : ""}${teacher.phone || ""}`
    : "Organize turmas, alunos e anotações com poucos toques.";

  const latest = await DB.listLatestNotes(10);
  const classes = await DB.listClasses();
  const students = await DB.listStudents();

  const html = latest.map(n => {
    const cls = classes.find(c=> c.id === n.classId);
    const st = n.studentId ? students.find(s=> s.id === n.studentId) : null;

    return `
      <div class="item">
        <div class="item-title">${esc(typeLabel(n.type))} • ${esc(cls?.name || "Turma")}${st ? ` • ${esc(st.name)}` : ""}</div>
        <div class="item-sub">${esc(n.text || "(sem texto)")}<br><span class="muted">${esc(fmtDate(n.createdAt))}</span></div>
      </div>
    `;
  }).join("") || `<div class="muted">Nenhuma nota ainda. Use “+ Nota rápida” para registrar durante a aula.</div>`;

  document.getElementById("latestNotes").innerHTML = html;
}

async function onAddSchool(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = (fd.get("name")||"").toString().trim();
  const notes = (fd.get("notes")||"").toString().trim();
  if(!name) return showToast("Nome obrigatório.");
  await DB.addSchool({ name, notes });
  e.target.reset();
  showToast("Escola adicionada.");
  await renderSchools();
}

async function renderSchools(){
  const schools = await DB.listSchools();
  const classes = await DB.listClasses();
  const list = document.getElementById("schoolsList");

  if(schools.length === 0){
    list.innerHTML = `<div class="muted">Cadastre uma escola para começar.</div>`;
    return;
  }

  list.innerHTML = schools.map(s => {
    const count = classes.filter(c=> c.schoolId === s.id).length;
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
    btn.addEventListener("click", async ()=>{
      const schoolId = btn.getAttribute("data-del-school");
      const cnt = await DB.countClassesBySchool(schoolId);
      if(cnt > 0){
        showToast("Não excluí: há turmas ligadas a essa escola.");
        return;
      }
      await DB.deleteSchool(schoolId);
      showToast("Escola removida.");
      await renderSchools();
    });
  });
}

async function onAddClass(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = (fd.get("name")||"").toString().trim();
  const schoolId = (fd.get("schoolId")||"").toString();
  const schedule = (fd.get("schedule")||"").toString().trim();
  if(!name) return showToast("Nome obrigatório.");
  if(!schoolId) return showToast("Selecione uma escola.");
  await DB.addClass({ name, schoolId, schedule });
  e.target.reset();
  showToast("Turma adicionada.");
  await renderClasses();
}

async function renderClasses(){
  const schools = await DB.listSchools();
  const classes = await DB.listClasses();
  const students = await DB.listStudents();

  // Fill select
  const sel = document.getElementById("classSchoolSelect");
  sel.innerHTML = schools.map(s=> `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("");
  if (schools.length === 0) {
    sel.innerHTML = `<option value="">Cadastre uma escola primeiro</option>`;
  }

  const list = document.getElementById("classesList");
  if(classes.length === 0){
    list.innerHTML = `<div class="muted">Nenhuma turma cadastrada ainda.</div>`;
    return;
  }

  list.innerHTML = classes.map(c => {
    const sch = schools.find(s=> s.id === c.schoolId);
    const count = students.filter(st=> st.classId === c.id).length;
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

  list.querySelectorAll("[data-open-quick]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      await renderQuickNote(btn.getAttribute("data-open-quick"));
      showView("quickNote");
    });
  });

  list.querySelectorAll("[data-del-class]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const classId = btn.getAttribute("data-del-class");
      const st = (await DB.listStudentsByClass(classId)).length;
      if(st > 0){
        showToast("Não excluí: há alunos ligados a essa turma.");
        return;
      }
      await DB.deleteClass(classId);
      showToast("Turma removida.");
      await renderClasses();
    });
  });
}

async function onAddStudent(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = (fd.get("name")||"").toString().trim();
  const classId = (fd.get("classId")||"").toString();
  const contact = (fd.get("contact")||"").toString().trim();
  if(!name) return showToast("Nome obrigatório.");
  if(!classId) return showToast("Selecione uma turma.");
  await DB.addStudent({ name, classId, contact });
  e.target.reset();
  showToast("Aluno adicionado.");
  await renderStudents();
}

async function renderStudents(){
  const classes = await DB.listClasses();
  const schools = await DB.listSchools();
  const students = await DB.listStudents();

  const sel = document.getElementById("studentClassSelect");
  sel.innerHTML = classes.map(c=> {
    const sch = schools.find(s=> s.id === c.schoolId);
    return `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(sch?.name || "Escola")}</option>`;
  }).join("");
  if(classes.length === 0){
    sel.innerHTML = `<option value="">Cadastre uma turma primeiro</option>`;
  }

  const q = (document.getElementById("studentSearch").value || "").trim().toLowerCase();
  const filtered = q ? students.filter(s=> s.name.toLowerCase().includes(q)) : students;

  const list = document.getElementById("studentsList");
  if(filtered.length === 0){
    list.innerHTML = `<div class="muted">Nenhum aluno encontrado.</div>`;
    return;
  }

  list.innerHTML = filtered.map(s => {
    const cls = classes.find(c=> c.id === s.classId);
    const sch = cls ? schools.find(sc=> sc.id === cls.schoolId) : null;
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

  list.querySelectorAll("[data-open-quick-student]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const studentId = btn.getAttribute("data-open-quick-student");
      const student = (await DB.listStudents()).find(x=> x.id === studentId);
      await renderQuickNote(student?.classId || "");
      await fillStudentsForQuickNote();
      document.getElementById("quickStudentSelect").value = studentId;
      showView("quickNote");
    });
  });

  list.querySelectorAll("[data-del-student]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const studentId = btn.getAttribute("data-del-student");
      await DB.deleteStudent(studentId);
      showToast("Aluno removido.");
      await renderStudents();
    });
  });
}

async function renderQuickNote(preselectClassId = ""){
  const classes = await DB.listClasses();
  const schools = await DB.listSchools();

  const clsSel = document.getElementById("quickClassSelect");
  clsSel.innerHTML = classes.map(c=>{
    const sch = schools.find(s=> s.id === c.schoolId);
    return `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(sch?.name || "Escola")}</option>`;
  }).join("");

  if(classes.length === 0){
    clsSel.innerHTML = `<option value="">Cadastre uma turma primeiro</option>`;
    document.getElementById("quickStudentSelect").innerHTML = `<option value="">—</option>`;
    document.getElementById("quickRecentNotes").innerHTML = `<div class="muted">Cadastre turmas para usar o modo aula.</div>`;
    return;
  }

  if(preselectClassId){
    clsSel.value = preselectClassId;
  }

  await fillStudentsForQuickNote();
  await renderQuickRecentNotes();
}

async function fillStudentsForQuickNote(){
  const classId = document.getElementById("quickClassSelect").value;
  const st = classId ? await DB.listStudentsByClass(classId) : [];

  const stSel = document.getElementById("quickStudentSelect");
  const base = `<option value="">— Nota geral da turma —</option>`;
  stSel.innerHTML = base + st.map(s=> `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("");
}

function currentNoteType(){
  const active = document.querySelector(".seg.active");
  return active ? active.getAttribute("data-type") : "evolution";
}

async function onSaveQuickNote(){
  const classId = document.getElementById("quickClassSelect").value;
  if(!classId) return showToast("Selecione uma turma.");

  const studentId = document.getElementById("quickStudentSelect").value || "";
  const type = currentNoteType();
  const text = (document.getElementById("quickText").value || "").trim();

  if(!text) return showToast("Escreva um texto rápido.");

  await DB.addNote({ type, classId, studentId, text });
  document.getElementById("quickText").value = "";

  showToast("Nota salva.");
  await renderQuickRecentNotes();
  await renderDashboard(); // atualiza “últimas notas”
}

async function renderQuickRecentNotes(){
  const classId = document.getElementById("quickClassSelect").value;
  const notes = classId ? await DB.listNotesByClass(classId, 20) : [];
  const students = await DB.listStudents();

  const box = document.getElementById("quickRecentNotes");
  if(notes.length === 0){
    box.innerHTML = `<div class="muted">Sem notas ainda. Use os botões acima para registrar durante a aula.</div>`;
    return;
  }

  box.innerHTML = notes.map(n=>{
    const st = n.studentId ? students.find(s=> s.id === n.studentId) : null;
    return `
      <div class="item">
        <div class="item-title">${esc(typeLabel(n.type))}${st ? ` • ${esc(st.name)}` : ""}</div>
        <div class="item-sub">${esc(n.text)}<br><span class="muted">${esc(fmtDate(n.createdAt))}</span></div>
      </div>
    `;
  }).join("");
}

async function renderAI(){
  const classes = await DB.listClasses();
  const sel = document.getElementById("aiClassSelect");
  sel.innerHTML = classes.map(c=> `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  if(classes.length === 0){
    sel.innerHTML = `<option value="">Cadastre uma turma primeiro</option>`;
  }
  document.getElementById("aiOutput").innerHTML = `<div class="muted">Selecione uma turma e clique em “Gerar insights”.</div>`;
}

async function onRunAI(){
  const classId = document.getElementById("aiClassSelect").value;
  if(!classId) return showToast("Selecione uma turma.");

  const out = document.getElementById("aiOutput");
  out.innerHTML = `<div class="muted">Processando insights...</div>`;

  try{
    const res = await runLocalAI({ classId });

    const counts = res.last30Counts;
    const html = `
      <div class="ai-box">
        <h3>Resumo (últimos 30 dias) • ${esc(res.className)}</h3>
        <div class="badge"><strong>Saúde</strong> ${esc(String(res.health))}/100</div>
        <div class="item-sub" style="margin-top:10px">
          Gerado em ${esc(res.generatedAt)} • Tendência: <strong>${esc(res.trend)}</strong>
        </div>
      </div>

      <div class="ai-box">
        <h3>Contagem por tipo</h3>
        <ul>
          <li>Evolução: <strong>${counts.evolution}</strong></li>
          <li>Necessidade: <strong>${counts.need}</strong></li>
          <li>Repertório: <strong>${counts.repertoire}</strong></li>
          <li>Plano de aula: <strong>${counts.plan}</strong></li>
        </ul>
      </div>

      <div class="ai-box">
        <h3>Alunos que podem precisar de atenção (últimos 14 dias)</h3>
        ${
          res.topNeeds.length === 0
            ? `<div class="muted">Nenhum alerta forte por necessidades. (Ou você registrou poucas notas “Necessidade”.)</div>`
            : `<ul>${res.topNeeds.map(x=> `<li>${esc(x.student)} — ${esc(String(x.count))} registros de necessidade</li>`).join("")}</ul>`
        }
      </div>

      <div class="ai-box">
        <h3>Sugestão rápida para próxima aula</h3>
        <ul>${res.suggestion.map(s=> `<li>${esc(s)}</li>`).join("")}</ul>
      </div>

      <div class="ai-box">
        <h3>Projeção (últimos dias)</h3>
        ${
          res.series.length === 0
            ? `<div class="muted">Sem série de dados suficiente ainda. Continue registrando notas.</div>`
            : `<div class="muted">Score diário (heurístico). Quanto mais evolução/repertório/plano, maior; necessidades reduzem.</div>
               <ul>${res.series.map(p=> `<li>${esc(p.day)} — score <strong>${esc(String(p.score))}</strong></li>`).join("")}</ul>`
        }
      </div>
    `;

    out.innerHTML = html;
    showToast("Insights gerados.");
  } catch (e) {
    console.error(e);
    out.innerHTML = `<div class="muted">Falha ao gerar insights. Verifique se há notas cadastradas.</div>`;
    showToast("Erro na IA.");
  }
}

async function exportData(){
  try{
    const payload = await DB.exportAll();
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
  } catch(e){
    console.error(e);
    showToast("Falha ao exportar.");
  }
}

async function importData(e){
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const txt = await file.text();
    const payload = JSON.parse(txt);
    await DB.importAll(payload);
    showToast("Importação concluída.");
    await renderDashboard();
    showView("dashboard");
  } catch(err){
    console.error(err);
    showToast("Arquivo inválido.");
  } finally {
    e.target.value = "";
  }
}

init();