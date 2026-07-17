import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET is not configured" });
    return;
  }
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, secret) as { sub: string; role?: string };
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) {
      res.status(401).json({ error: "Invalid token subject" });
      return;
    }
    req.user = { id, role: payload.role ?? "security" };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
