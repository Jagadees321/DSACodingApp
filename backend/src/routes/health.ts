import { Router } from "express";
import mongoose from "mongoose";
import { metricsText } from "../lib/metrics.js";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.json({ ok: true, status: "live" });
});

healthRouter.get("/ready", (_req, res) => {
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    return res.status(503).json({ ok: false, status: "db_not_ready" });
  }
  return res.json({ ok: true, status: "ready" });
});

healthRouter.get("/metrics", async (_req, res) => {
  res.type("text/plain");
  res.send(await metricsText());
});

