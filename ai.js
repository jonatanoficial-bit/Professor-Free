/* IA local: heurísticas + projeções simples (sem internet) */

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function typeLabel(t) {
  return ({
    evolution: "Evolução",
    need: "Necessidade",
    repertoire: "Repertório",
    plan: "Plano"
  }[t] || t);
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

/**
 * Gera insights por turma:
 * - Resumo das notas
 * - Alunos com mais "necessidades" recentes
 * - Projeção simples de evolução da turma nas últimas semanas
 */
async function runLocalAI({ classId }) {
  const classes = await DB.listClasses();
  const students = await DB.listStudentsByClass(classId);
  const notes = await DB.listNotesByClass(classId, 500);

  const cls = classes.find(c => c.id === classId);
  const now = Date.now();
  const last30 = notes.filter(n => (now - n.createdAt) <= (30 * 24 * 60 * 60 * 1000));

  const counts = { evolution:0, need:0, repertoire:0, plan:0 };
  for (const n of last30) counts[n.type] = (counts[n.type] || 0) + 1;

  // Score por dia: evolução +2, need -2, repertoire +1, plan +1
  const dayMap = new Map(); // yyyy-mm-dd -> score
  for (const n of notes) {
    const d = new Date(n.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const base = dayMap.get(key) || 0;
    const delta = (n.type === "evolution") ? 2 : (n.type === "need" ? -2 : 1);
    dayMap.set(key, base + delta);
  }

  const days = Array.from(dayMap.entries())
    .sort((a,b)=> a[0].localeCompare(b[0]))
    .slice(-21); // últimas 3 semanas aprox

  const series = days.map(([k,v]) => ({ day:k, score:v }));

  // tendência linear simples (minimamente robusta)
  let trend = "estável";
  if (series.length >= 6) {
    const xs = series.map((_,i)=> i+1);
    const ys = series.map(p=> p.score);
    const n = xs.length;
    const sumX = xs.reduce((a,b)=>a+b,0);
    const sumY = ys.reduce((a,b)=>a+b,0);
    const sumXY = xs.reduce((acc,x,i)=> acc + x*ys[i], 0);
    const sumXX = xs.reduce((acc,x)=> acc + x*x, 0);
    const denom = (n*sumXX - sumX*sumX) || 1;
    const slope = (n*sumXY - sumX*sumY) / denom;

    if (slope > 0.15) trend = "melhorando";
    else if (slope < -0.15) trend = "piorando";
    else trend = "estável";
  }

  // alunos que precisam de atenção: mais notas "need" nos últimos 14 dias
  const last14 = notes.filter(n => (now - n.createdAt) <= (14 * 24 * 60 * 60 * 1000));
  const needByStudent = new Map(); // id -> count
  for (const n of last14) {
    if (n.type !== "need") continue;
    if (!n.studentId) continue;
    needByStudent.set(n.studentId, (needByStudent.get(n.studentId)||0) + 1);
  }
  const topNeeds = Array.from(needByStudent.entries())
    .sort((a,b)=> b[1]-a[1])
    .slice(0, 5)
    .map(([studentId, c]) => {
      const st = students.find(s=> s.id === studentId);
      return { student: st ? st.name : "Aluno (não encontrado)", count: c };
    });

  // plano sugerido (heurístico): se muita necessidade, reforçar base; se muita evolução, avançar repertório
  const needRatio = counts.need / Math.max(1, (counts.need + counts.evolution + counts.repertoire + counts.plan));
  const evoRatio = counts.evolution / Math.max(1, (counts.need + counts.evolution + counts.repertoire + counts.plan));

  let suggestion = [];
  if (needRatio >= 0.35) {
    suggestion.push("Reforçar fundamentos na próxima aula (passos pequenos e repetição guiada).");
    suggestion.push("Separar 10–15 min para correções individuais rápidas (rotina de 1 minuto por aluno).");
  } else if (evoRatio >= 0.35) {
    suggestion.push("Aumentar desafio: inserir variação/nível acima no repertório.");
    suggestion.push("Registrar evidências de evolução (metas pequenas por aluno).");
  } else {
    suggestion.push("Manter equilíbrio: 1 bloco de base + 1 bloco de repertório + 1 bloco de revisão.");
  }

  // “Score de saúde” da turma (0-100)
  const raw = (counts.evolution*3 + counts.repertoire*2 + counts.plan*2) - (counts.need*3);
  const health = clamp(Math.round(50 + raw), 0, 100);

  return {
    className: cls ? cls.name : "Turma",
    generatedAt: fmtDate(Date.now()),
    last30Counts: counts,
    trend,
    series,
    topNeeds,
    suggestion,
    health
  };
}