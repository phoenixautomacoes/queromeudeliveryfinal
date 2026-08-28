import { Router } from "express";
import { getDb } from "../db";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    app: "Quero Meu Delivery V2",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get("/ready", (req, res) => {
  const db = getDb();
  res.json({
    status: "ready",
    database: "connected",
    storesCount: db.stores.length,
    usersCount: db.users.length,
    productsCount: db.products.length,
    timestamp: new Date().toISOString(),
  });
});

router.get("/version", (req, res) => {
  res.json({
    version: "2.0.0",
    commit: "feat/qmd-v2-full-architecture",
    node: process.version,
    environment: process.env.NODE_ENV || "development",
  });
});

export default router;
