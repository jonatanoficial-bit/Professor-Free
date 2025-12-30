import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthReq = Request & { userId?: string };

export function auth(jwtSecret: string) {
  return (req: AuthReq, res: Response, next: NextFunction) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) return res.status(401).send("missing token");
    try {
      const payload = jwt.verify(token, jwtSecret) as any;
      req.userId = payload?.uid;
      if (!req.userId) return res.status(401).send("bad token");
      next();
    } catch {
      return res.status(401).send("invalid token");
    }
  };
}