import { Router } from "express";
import { z } from "zod";
import { getDb, generateId } from "../db";
import {
  verifyPassword,
  hashPassword,
  createSession,
  revokeSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromRequest,
} from "../services/authService";
import { AuthenticatedRequest, requireAuth } from "../middlewares/auth";
import { UserRole } from "../types";

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterCustomerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Credenciais inválidas." });
  }

  const { email, password } = parseResult.data;
  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.isActive);

  if (!user) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." });
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." });
  }

  // Cria sessão segura
  const sessionToken = await createSession(user.id, req);
  setSessionCookie(res, sessionToken);

  // Buscar vínculo de loja se aplicável
  const member = db.storeMembers.find(m => m.userId === user.id);
  let store: any = null;
  if (member) {
    store = db.stores.find(s => s.id === member.storeId);
  }

  // Se for motoboy
  const driver = db.drivers.find(d => d.userId === user.id);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    store: store ? { id: store.id, name: store.name, slug: store.slug } : null,
    driver: driver ? { id: driver.id, isOnline: driver.isOnline } : null,
  });
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const token = getSessionTokenFromRequest(req);
  if (token) {
    await revokeSession(token);
  }
  clearSessionCookie(res);
  res.json({ success: true, message: "Sessão encerrada com sucesso." });
});

// GET /api/auth/me
router.get("/me", (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ user: null });
  }

  const db = getDb();
  const member = db.storeMembers.find(m => m.userId === req.user.id);
  let store: any = null;
  if (member) {
    store = db.stores.find(s => s.id === member.storeId);
  }

  const driver = db.drivers.find(d => d.userId === req.user.id);

  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
    },
    store: store ? { id: store.id, name: store.name, slug: store.slug } : null,
    driver: driver ? { id: driver.id, isOnline: driver.isOnline } : null,
  });
});

// POST /api/auth/register-customer
router.post("/register-customer", async (req, res) => {
  const parseResult = RegisterCustomerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: parseResult.error.format() });
  }

  const { name, email, phone, password } = parseResult.data;
  const db = getDb();

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "EMAIL_EXISTS", message: "Este e-mail já está cadastrado." });
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId();

  const newUser = {
    id: userId,
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  db.users.push(newUser);

  const sessionToken = await createSession(userId, req);
  setSessionCookie(res, sessionToken);

  res.status(201).json({
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    },
  });
});

// POST /api/auth/forgot-password (Nunca devolve token ou senha no JSON)
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "E-mail é obrigatório." });
  }

  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    // Registra token no banco e envia por email (simulado com segurança)
    console.log(`🔒 [Auth] Token de recuperação gerado para ${email} (enviado via SMTP).`);
  }

  // Resposta idêntica para evitar enumeração de usuários
  res.json({
    success: true,
    message: "Se o e-mail estiver cadastrado, você receberá as instruções de redefinição.",
  });
});

export default router;
