import type { Insights, LessonLog, ID } from "../types/models";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * "IA" local (sem API):
 * - tendência baseada nas últimas N aulas
 * - projeção simples (média ponderada + penalidade por "needs")
 * - risco baseado em queda e baixa frequência de logs recentes
 */
export function buildInsights(studentId: ID, logs: LessonLog[]): Insights {
  const sorted = [...logs].sort((a, b) => a.date - b.date);
  const last = sorted.slice(-6);
  const n = last.length;

  const avg = n ? last.reduce((s, l) => s + l.evolutionScore, 0) / n : 0;

  // tendência: compara primeira metade vs segunda
  let trend: Insights["trend"] = "flat";
  if (n >= 4) {
    const mid = Math.floor(n / 2);
    const a = last.slice(0, mid).reduce((s, l) => s + l.evolutionScore, 0) / mid;
    const b = last.slice(mid).reduce((s, l) => s + l.evolutionScore, 0) / (n - mid);
    if (b - a > 0.6) trend = "up";
    else if (a - b > 0.6) trend = "down";
  }

  const needsCount: Record<string, number> = {};
  for (const l of last) for (const t of l.needs) needsCount[t] = (needsCount[t] || 0) + 1;
  const topNeed = Object.entries(needsCount).sort((x, y) => y[1] - x[1])[0]?.[0];

  // projeção: média ponderada (mais recente pesa mais)
  let wSum = 0;
  let sSum = 0;
  for (let i = 0; i < n; i++) {
    const w = i + 1;
    wSum += w;
    sSum += last[i].evolutionScore * w;
  }
  let projected = wSum ? sSum / wSum : avg;

  // penalidade leve se tem muitas necessidades
  const needsTotal = Object.values(needsCount).reduce((s, v) => s + v, 0);
  projected = projected - clamp(needsTotal * 0.08, 0, 1.2);
  projected = clamp(projected, 0, 10);

  // risco
  const lastDate = last.at(-1)?.date ?? 0;
  const daysSince = lastDate ? (Date.now() - lastDate) / (1000 * 60 * 60 * 24) : 999;
  let risk: Insights["risk"] = "low";
  if (trend === "down" || projected < 4) risk = "medium";
  if (trend === "down" && (projected < 3.5 || daysSince > 21)) risk = "high";
  if (daysSince > 45) risk = "high";

  // sugestão
  let suggestion = "Manter rotina e registrar evolução.";
  if (risk !== "low") suggestion = "Reforçar base e revisar objetivos da próxima aula.";
  if (topNeed) suggestion = `Foco sugerido: ${topNeed}. Crie um mini-plano de 10 minutos para isso.`;
  if (trend === "up") suggestion = "Evolução positiva: aumentar desafio gradualmente e registrar repertório.";

  return {
    studentId,
    trend,
    projectedScore: Number(projected.toFixed(1)),
    risk,
    suggestion
  };
}