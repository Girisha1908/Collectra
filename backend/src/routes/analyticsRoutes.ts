import { Router } from "express";
import * as analyticsController from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../util/asyncHandler.js";

export const analyticsRoutes = Router();

analyticsRoutes.use(requireAuth);

analyticsRoutes.get("/", asyncHandler(analyticsController.getAnalytics));
analyticsRoutes.get("/dashboard", asyncHandler(analyticsController.getAnalytics));
