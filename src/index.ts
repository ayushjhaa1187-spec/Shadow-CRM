// @ts-nocheck
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { computeLeadScore } from "./scoring";
import { ScoreComponents, ScoreExplanation } from "./types";
import scraperRoutes from "./routes/scraper";
import queueRoutes from "./routes/queue";
import webhookRoutes from "./routes/webhooks";
import messageRoutes from "./routes/messages";
import { setupQueueListeners, shutdownQueues } from "./queue/config";
import { setupWorkerListeners, schedulePeriodicDecay } from "./queue/workers";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize queues and workers
setupQueueListeners();
setupWorkerListeners();
schedulePeriodicDecay(6); // Every 6 hours

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/score", (req, res) => {
  const { icpFit, intent, timing, momentum, explanation } = req.body || {};

  const required = [icpFit, intent, timing, momentum];
  if (required.some((v) => typeof v !== "number")) {
    return res
      .status(400)
      .json({ error: "icpFit, intent, timing, momentum must be numbers (0-100)." });
  }

  const payload: ScoreComponents = { icpFit, intent, timing, momentum };
  const expl: Partial<ScoreExplanation> = explanation || {};
  const scored = computeLeadScore(payload, expl);
  return res.json(scored);
});

// Scraper routes
app.use("/api/scrape", scraperRoutes);

// Queue routes
app.use("/api/queue", queueRoutes);

// Webhook routes
app.use("/api/webhooks", webhookRoutes);

// Message generation routes
app.use("/api/messages", messageRoutes);

const port = process.env.PORT || 3000;

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await shutdownQueues();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await shutdownQueues();
  process.exit(0);
});

// Local dev server; Vercel will handle serverless export instead.
if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`Shadow CRM API listening on ${port}`);
  });
}

export default app;
