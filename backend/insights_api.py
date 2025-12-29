from fastapi import APIRouter, Depends
from auth import require_auth

router = APIRouter(prefix="/insights", tags=["insights"])

# Endpoint opcional (online) — não é obrigatório para o app funcionar.
# Pode evoluir para IA generativa self-host sem terceiros.
@router.post("/project")
def project(payload: dict, auth=Depends(require_auth)):
  evol = payload.get("evolutions", [])
  if not evol:
    return {"trend": 0.0, "projectionNext": 0.0, "recommendation": "Sem dados."}

  alpha = 0.45
  s = float(evol[0])
  for x in evol[1:]:
    s = alpha * float(x) + (1 - alpha) * s

  recent = evol[-6:] if len(evol) >= 6 else evol
  avg_recent = sum(recent) / len(recent)
  trend = s - avg_recent
  proj = s

  if proj >= 1.2:
    rec = "Tendência forte de melhora. Aumente gradualmente a complexidade."
  elif proj >= 0.4:
    rec = "Melhora consistente. Mantenha rotina e foque nas necessidades."
  elif proj > -0.4:
    rec = "Oscilação normal. Ajuste o plano com 1 objetivo principal por aula."
  else:
    rec = "Tendência de dificuldade. Reduza carga e revise fundamentos."

  return {"trend": trend, "projectionNext": proj, "recommendation": rec}