import { db, getServerUrl } from "./db";
import type { SyncChange } from "../types/models";
import { api } from "./api";

export async function enqueueChange(change: Omit<SyncChange, "id">) {
  // id é chave local da fila
  const id = `${change.entity}|${change.entityId}|${change.updatedAt}`;
  await db.syncQueue.put({ ...change, id });
}

export async function getLastPullAt(): Promise<number> {
  const row = await db.kv.get("lastPullAt");
  return (row?.value as number) || 0;
}

export async function setLastPullAt(ts: number): Promise<void> {
  await db.kv.put({ key: "lastPullAt", value: ts });
}

async function applyUpsert(entity: SyncChange["entity"], payload: any) {
  switch (entity) {
    case "professor": await db.professor.put(payload); break;
    case "school": await db.schools.put(payload); break;
    case "class": await db.classes.put(payload); break;
    case "student": await db.students.put(payload); break;
    case "lessonLog": await db.lessonLogs.put(payload); break;
  }
}

async function applyDelete(entity: SyncChange["entity"], entityId: string) {
  switch (entity) {
    case "professor": await db.professor.delete(entityId); break;
    case "school": await db.schools.delete(entityId); break;
    case "class": await db.classes.delete(entityId); break;
    case "student": await db.students.delete(entityId); break;
    case "lessonLog": await db.lessonLogs.delete(entityId); break;
  }
}

export async function runSync(): Promise<{ pushed: number; pulled: number; skipped: boolean }> {
  const base = await getServerUrl();
  if (!base) return { pushed: 0, pulled: 0, skipped: true };

  // PUSH
  const queue = await db.syncQueue.orderBy("updatedAt").toArray();
  let pushed = 0;
  if (queue.length) {
    const payload = queue.map((c) => ({
      clientId: c.id,
      entity: c.entity,
      entityId: c.entityId,
      op: c.op,
      payload: c.payload,
      updatedAt: c.updatedAt
    }));

    const resp = await api.push(payload);
    const okIds: string[] = resp?.acceptedIds || [];
    if (okIds.length) {
      await db.syncQueue.bulkDelete(okIds);
      pushed = okIds.length;
    }
  }

  // PULL
  const since = await getLastPullAt();
  const pullResp = await api.pull(since);
  const changes: Array<{ entity: any; entityId: string; op: any; payload: any; updatedAt: number }> =
    pullResp?.changes || [];

  for (const c of changes) {
    if (c.op === "upsert") await applyUpsert(c.entity, c.payload);
    if (c.op === "delete") await applyDelete(c.entity, c.entityId);
  }

  const newSince = pullResp?.serverNow ?? Date.now();
  await setLastPullAt(newSince);

  return { pushed, pulled: changes.length, skipped: false };
}