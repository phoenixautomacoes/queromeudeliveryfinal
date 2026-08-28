import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { authMiddleware } from "./server/middlewares/auth";
import { seedDatabase } from "./server/db/seed";

import publicRoutes from "./server/routes/publicRoutes";
import authRoutes from "./server/routes/authRoutes";
import customerRoutes from "./server/routes/customerRoutes";
import adminRoutes from "./server/routes/adminRoutes";
import driverRoutes from "./server/routes/driverRoutes";
import webhookRoutes from "./server/routes/webhookRoutes";
import healthRoutes from "./server/routes/healthRoutes";

const app = express();
const PORT = 3000;

// 1. Headers de Segurança & CORS
app.use(
  helmet({
    contentSecurityPolicy: false, // Permite assets Vite e WebP externos
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// 2. Middlewares de Parser
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(authMiddleware);

// 3. Rotas da API REST
app.use("/api/health", healthRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/webhooks", webhookRoutes);

// 4. Error Handler Centralizado
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ [API Error]:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: "INTERNAL_SERVER_ERROR",
    message: process.env.NODE_ENV === "production" ? "Ocorreu um erro interno." : err.message,
  });
});

// 5. Inicialização e Middleware Vite SPA
async function startServer() {
  // Inicializar dados de demonstração
  await seedDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 [QMD V2] Servidor rodando com sucesso em http://0.0.0.0:${PORT}`);
    console.log(`🍔 Loja Demo: Burger Craft (/store/burger-craft)`);
    console.log(`🔐 Admin: /admin (admin@phoenixautomacoes.com / Admin@Phoenix2026)`);
  });
}

startServer();
