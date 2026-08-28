import { Request, Response, NextFunction } from "express";
import { getSessionTokenFromRequest, validateSession } from "../services/authService";
import { UserRole } from "../types";

export interface AuthenticatedRequest extends Request {
  user?: any;
  member?: any;
  resolvedStore?: any;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = getSessionTokenFromRequest(req);
  if (!token) {
    return next();
  }

  try {
    const sessionData = await validateSession(token);
    if (sessionData) {
      req.user = sessionData.user;
      req.member = sessionData.member;
    }
  } catch (err) {
    console.error("Erro ao validar sessão:", err);
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Você precisa estar autenticado para acessar este recurso.",
    });
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Autenticação necessária.",
      });
    }

    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next(); // Super admin tem acesso irrestrito
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Você não possui permissão de acesso para esta funcionalidade.",
      });
    }

    next();
  };
}
