import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { getDb, generateId } from "../db";
import { UserRole } from "../types";

const SESSION_COOKIE_NAME = "qmd_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const pepper = process.env.PASSWORD_PEPPER || "";
  return bcrypt.hash(password + pepper, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const pepper = process.env.PASSWORD_PEPPER || "";
  return bcrypt.compare(password + pepper, hash);
}

export async function createSession(userId: string, req: Request): Promise<string> {
  const db = getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  const userAgent = req.headers["user-agent"] || "";
  const ipAddress = req.ip || req.socket.remoteAddress || "";
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  db.sessions.push({
    id: generateId(),
    userId,
    tokenHash,
    userAgent,
    ipAddress,
    expiresAt,
    createdAt: new Date(),
  });

  return rawToken;
}

export async function validateSession(rawToken: string): Promise<{ user: any; member?: any } | null> {
  if (!rawToken) return null;
  const db = getDb();
  const tokenHash = hashToken(rawToken);

  const session = db.sessions.find(s => s.tokenHash === tokenHash);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    // Session expired - remove it
    db.sessions = db.sessions.filter(s => s.id !== session.id);
    return null;
  }

  const user = db.users.find(u => u.id === session.userId && u.isActive);
  if (!user) return null;

  const member = db.storeMembers.find(m => m.userId === user.id);

  return { user, member };
}

export async function revokeSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  db.sessions = db.sessions.filter(s => s.tokenHash !== tokenHash);
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function getSessionTokenFromRequest(req: Request): string | null {
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}
