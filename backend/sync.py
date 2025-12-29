import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Change
from auth import require_auth

router = APIRouter(prefix="/sync", tags=["sync"])

@router.post("/push")
def push(payload: dict, auth=Depends(require_auth), db: Session = Depends(get_db)):
  teacher_id = payload.get("teacherId")
  device_id = payload.get("deviceId")
  events = payload.get("events", [])

  if not teacher_id or not device_id:
    raise HTTPException(status_code=400, detail="teacherId/deviceId required")

  for ev in events:
    entity = ev.get("entity")
    entity_id = ev.get("entityId")
    op = ev.get("op")
    body = ev.get("payload")
    created_at = ev.get("createdAt")

    if not entity or not entity_id or not op or body is None:
      continue

    # armazena como "Change" para pull posterior
    ch = Change(
      teacher_id=teacher_id,
      entity=entity,
      entity_id=entity_id,
      op=op,
      payload_json=json.dumps(body, ensure_ascii=False),
      happened_at=datetime.utcnow(),
    )
    db.add(ch)

  db.commit()
  return {"ok": True, "stored": len(events)}

@router.get("/pull")
def pull(since: str, auth=Depends(require_auth), db: Session = Depends(get_db)):
  # since ISO 8601
  try:
    since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
  except Exception:
    raise HTTPException(status_code=400, detail="Invalid since ISO")

  # MVP: retorna tudo desde "since" (não filtra por teacher no MVP de token dev, mas deveria em prod)
  q = db.query(Change).filter(Change.happened_at >= since_dt).order_by(Change.happened_at.asc()).limit(2000)
  rows = q.all()

  changes = []
  for r in rows:
    changes.append({
      "teacherId": r.teacher_id,
      "entity": r.entity,
      "entityId": r.entity_id,
      "op": r.op,
      "payload": json.loads(r.payload_json),
      "happenedAt": r.happened_at.isoformat(),
    })

  return {"changes": changes}