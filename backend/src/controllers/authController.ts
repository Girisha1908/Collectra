import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { HttpError } from "../middleware/errorHandler.js";
import * as userModel from "../models/userModel.js";

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN ?? "24h";

function signToken(user: { id: number; role: string }): string {
  if (!secret) throw new HttpError(500, "JWT_SECRET is not configured");
  const opts: SignOptions = { expiresIn: expiresIn as SignOptions["expiresIn"] };
  return jwt.sign({ sub: String(user.id), role: user.role }, secret, opts);
}

export async function register(req: Request, res: Response): Promise<void> {
  if (!secret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }
  const body = req.body as { username?: string; password?: string; role?: string };
  const username = body.username?.trim();
  const password = body.password;
  if (!username || !password) {
    throw new HttpError(400, "username and password are required");
  }
  if (username.length > 50 || password.length < 6) {
    throw new HttpError(400, "invalid username or password length");
  }
  const role = "security"; // Never trust a client-supplied role — promote via DB only
  const existing = await userModel.findUserByUsername(username);
  if (existing) {
    throw new HttpError(409, "username already taken");
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await userModel.createUser(username, password_hash, role);
  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  if (!secret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }
  const body = req.body as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password;
  if (!username || !password) {
    throw new HttpError(400, "username and password are required");
  }
  const user = await userModel.findUserByUsername(username);
  if (!user) {
    throw new HttpError(401, "invalid credentials");
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new HttpError(401, "invalid credentials");
  }
  const token = signToken({ id: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
}
