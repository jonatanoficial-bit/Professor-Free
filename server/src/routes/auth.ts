import { Router } from "express";
import jwt from "jsonwebtoken";
import type sqlite3 from "sqlite3";
import { get, run } from "../db/sqlite";
import { registerSchema, loginSchema } from "../lib/validate";
import { scryptHash, safeEqualHex, uid } from "../lib/crypto";

export function authRoutes(db: sqlite3.Database, jwtSecret: string) {
  const r = Router();

  r.post("/register", async (req, res) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);

      const existing = await get<{ id: string }>(db, "SELECT id FROM users WHERE email = ?", [email]);
      if (existing) return res.status(409).send("email already registered");

      const now = Date.now();
      const id = uid("usr");
      const { saltHex, hashHex } = scryptHash(password);

      await run(
        db,
        "INSERT INTO users(id, email, name, pass_salt, pass_hash, created_at) VALUES(?,?,?,?,?,?)",
        [id, email, name, saltHex, hashHex, now]
      );

      const token = jwt.sign({ uid: id }, jwtSecret, { expiresIn: "30d" });
      return res.json({ token });
    } catch (e: any) {
      return res.status(400).send(e?.message || "bad request");
    }
  });

  r.post("/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await get<{ id: string; pass_salt: string; pass_hash: string }>(
        db,
        "SELECT id, pass_salt, pass_hash FROM users WHERE email = ?",
        [email]
      );
      if (!user) return res.status(401).send("invalid credentials");

      const { hashHex } = scryptHash(password, user.pass_salt);
      if (!safeEqualHex(hashHex, user.pass_hash)) return res.status(401).send("invalid credentials");

      const token = jwt.sign({ uid: user.id }, jwtSecret, { expiresIn: "30d" });
      return res.json({ token });
    } catch (e: any) {
      return res.status(400).send(e?.message || "bad request");
    }
  });

  return r;
}