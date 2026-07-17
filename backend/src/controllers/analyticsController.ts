import type { Request, Response } from "express";
import * as analyticsModel from "../models/analyticsModel.js";

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const days = Number(req.query.days);
  const windowDays = Number.isFinite(days) && days > 0 && days <= 365 ? days : 30;

  const [byStatus, ordersPerDay, ordersCollectedPerDay, avgReleaseSeconds] = await Promise.all([
    analyticsModel.getStatusCounts(),
    analyticsModel.getOrdersCreatedPerDay(windowDays),
    analyticsModel.getOrdersCollectedPerDay(windowDays),
    analyticsModel.getAvgReleaseSeconds(),
  ]);

  res.json({
    byStatus,
    ordersPerDay,
    ordersCollectedPerDay,
    avgReleaseSeconds,
  });
}
