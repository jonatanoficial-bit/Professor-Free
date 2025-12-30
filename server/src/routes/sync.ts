import { Router } from "express";
import type sqlite3 from "sqlite3";
import { all, run } from "../db/sqlite";
import { pushSchema } from "../lib/validate";
import { uid } from "../lib/crypto";
import type { AuthReq } from "../middleware/auth";

export function syncRoutes(db: sqlite3.Database) {
  const r = Router();

  // push: recebe changes do cliente e armazena
  r.post("/push", async (req: AuthReq, res) => {
    try {
      const userId = req.userId!;
      const { changes } = pushSchema.parse(req.body);
      const acceptedIds: string[] = [];

      // armazenar id por change (o cliente manda sem id interno; aqui geramos e devolvemos "acceptedIds" como ids do cliente?),
      // Para manter simples e estável: o cliente usa o id do syncQueue como "aceito".
      // Então vamos receber também header "x-client-change-ids"? Não.
      // Solução robusta no MVP: cliente envia changes na mesma ordem da fila e envia junto entityId+updatedAt; devolvemos "acceptedIds"
      // como string composta "entityId|updatedAt". E o cliente salva change.id local e compara.
      // Mas no web já espera acceptedIds como IDs do syncQueue. Vamos então aceitar um campo opcional clientId via payload.
      // Para não quebrar: se req.body.changes tiver "clientId", usamos.
      // (Compatível com o web porque ele não manda; então vamos inventar id próprio e devolver vazio -> não apaga fila.)
      // Ajuste: web já manda sem clientId. Então AQUI vamos aceitar e devolver entityId+updatedAt como fallback.
      for (const c of changes as any[]) {
        const changeId = c.clientId || `${c.entity}|${c.entityId}|${c.updatedAt}`;
        const id = uid("chg");
        await run(
          db,
          "INSERT INTO changes(id, user_id, entity, entity_id, op, payload, updated_at) VALUES(?,?,?,?,?,?,?)",
          [id, userId, c.entity, c.entityId, c.op, c.payload ? JSON.stringify(c.payload) : null, c.updatedAt]
        );
        acceptedIds.push(changeId);
      }

      return res.json({ acceptedIds });
    } catch (e: any) {
      return res.status(400).send(e?.message || "bad request");
    }
  });

  // pull: devolve changes depois de "since"
  r.get("/pull", async (req: AuthReq, res) => {
    const userId = req.userId!;
    const since = Number(req.query.since || 0) || 0;

    const rows = await all<{
      entity: string;
      entity_id: string;
      op: string;
      payload: string | null;
      updated_at: number;
    }>(db, "SELECT entity, entity_id, op, payload, updated_at FROM changes WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC", [
      userId,
      since
    ]);

    const changes = rows.map((r) => ({
      entity: r.entity,
      entityId: r.entity_id,
      op: r.op,
      payload: r.payload ? JSON.parse(r.payload) : null,
      updatedAt: r.updated_at
    }));

    return res.json({ changes, serverNow: Date.now() });
  });

  return r;
}