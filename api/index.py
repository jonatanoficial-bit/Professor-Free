import os
import json
from datetime import datetime, timezone

from fastapi import FastAPI, Header, HTTPException
from sqlalchemy import create_engine, text

def require_auth(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.replace("Bearer ", "").strip()
    if token == "dev-token":
        return {"sub": "dev", "role": "teacher"}
    raise HTTPException(status_code=401, detail="Invalid token")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
engine = create_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None

def ensure_schema():
    if engine is None:
        return
    with engine.begin() as conn:
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS changes (
          id BIGSERIAL PRIMARY KEY,
          teacher_id TEXT NOT NULL,
          entity TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          op TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_changes_happened ON changes(happened_at);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_changes_teacher ON changes(teacher_id);"))

ensure_schema()

app = FastAPI(title="Teacher Assist API (Vercel)")

@app.get("/api/health")
def health():
    return {"ok": True, "server_time": datetime.now(timezone.utc).isoformat()}

@app.post("/api/sync/push")
def sync_push(payload: dict, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

    teacher_id = payload.get("teacherId")
    device_id = payload.get("deviceId")
    events = payload.get("events", [])

    if not teacher_id or not device_id:
        raise HTTPException(status_code=400, detail="teacherId/deviceId required")

    stored = 0
    with engine.begin() as conn:
        for ev in events:
            entity = ev.get("entity")
            entity_id = ev.get("entityId")
            op = ev.get("op")
            body = ev.get("payload")

            if not entity or not entity_id or not op or body is None:
                continue

            conn.execute(
                text("""
                INSERT INTO changes (teacher_id, entity, entity_id, op, payload_json, happened_at)
                VALUES (:teacher_id, :entity, :entity_id, :op, :payload_json, NOW())
                """),
                {
                    "teacher_id": teacher_id,
                    "entity": entity,
                    "entity_id": entity_id,
                    "op": op,
                    "payload_json": json.dumps(body, ensure_ascii=False),
                },
            )
            stored += 1

    return {"ok": True, "stored": stored}

@app.get("/api/sync/pull")
def sync_pull(since: str, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    if engine is None:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

    try:
        since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid since ISO")

    with engine.begin() as conn:
        rows = conn.execute(
            text("""
            SELECT teacher_id, entity, entity_id, op, payload_json, happened_at
            FROM changes
            WHERE happened_at >= :since
            ORDER BY happened_at ASC
            LIMIT 2000
            """),
            {"since": since_dt},
        ).fetchall()

    changes = []
    for r in rows:
        changes.append({
            "teacherId": r[0],
            "entity": r[1],
            "entityId": r[2],
            "op": r[3],
            "payload": json.loads(r[4]),
            "happenedAt": r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
        })

    return {"changes": changes}
