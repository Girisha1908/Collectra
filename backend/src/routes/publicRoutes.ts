import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { asyncHandler } from "../util/asyncHandler.js";

export const publicRoutes = Router();

publicRoutes.get("/tracking/:orderId", asyncHandler(orderController.getPublicOrderDetails));
publicRoutes.get("/orders/:orderId", asyncHandler(orderController.getPublicOrderDetails));

