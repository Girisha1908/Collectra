import "dotenv/config";
import cors from "cors";
import cron from "node-cron";
import express from "express";
import helmet from "helmet";
import { runOverdueJob } from "./jobs/overdueJob.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/authMiddleware.js";
import { analyticsRoutes } from "./routes/analyticsRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { orderRoutes } from "./routes/orderRoutes.js";
import { publicRoutes } from "./routes/publicRoutes.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(helmet());
const allowedOrigin = process.env.CORS_ORIGIN;
if (!allowedOrigin && process.env.NODE_ENV === "production") {
  throw new Error("CORS_ORIGIN must be set in production");
}
app.use(cors({ origin: allowedOrigin ?? "http://localhost:9002" }));
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "collectra-api",
    docs: "This is the JSON API. Use /health for a quick check.",
    health: "/health",
    routes: ["/api/auth", "/api/orders", "/api/analytics"],
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "collectra-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/public", publicRoutes);

// A manual trigger for administrators to force a reminder check
app.get("/api/admin/trigger-reminders", requireAuth, async (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admins only" });
    return;
  }
  try {
    const n = await runOverdueJob();
    res.json({ success: true, count: n, message: `Successfully checked and sent ${n} reminders.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Collectra API listening on http://localhost:${port}`);

  // Run the overdue check once on startup for development convenience
  void runOverdueJob()
    .then((n) => console.log(`[startup overdue] checked and reminded ${n} orders`))
    .catch((err) => console.error("[startup error]", err));
});

cron.schedule("0 0 * * *", () => {
  void runOverdueJob()
    .then((n) => console.log(`[cron overdue] updated ${n} row(s)`))
    .catch((err) => console.error("[cron overdue]", err));
});
