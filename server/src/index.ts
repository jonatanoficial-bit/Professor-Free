import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { openDB } from "./db/sqlite";
import { migrate } from "./db/migrations";
import { authRoutes } from "./routes/auth";
import { syncRoutes } from "./routes/sync";
import { auth } from "./middleware/auth";

dotenv.config();

const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = String(process.env.JWT_SECRET || "change-me");
const DB_FILE = String(process.env.DB_FILE || "./data.sqlite");
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || "*");

const app = express();
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

const db = openDB(DB_FILE);

(async () => {
  await migrate(db);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRoutes(db, JWT_SECRET));
  app.use("/sync", auth(JWT_SECRET), syncRoutes(db));

  app.listen(PORT, () => {
    console.log(`Professor Pocket Server on http://localhost:${PORT}`);
  });
})().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});