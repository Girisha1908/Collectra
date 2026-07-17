import { Router } from "express";
import * as orderController from "../controllers/orderController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../util/asyncHandler.js";

export const orderRoutes = Router();

orderRoutes.use(requireAuth);

orderRoutes.get("/", asyncHandler(orderController.listOrders));
orderRoutes.post("/", asyncHandler(orderController.createOrder));

orderRoutes.post("/:orderId/send-otp", asyncHandler(orderController.sendOtp));
orderRoutes.post("/:orderId/verify-otp", asyncHandler(orderController.verifyOtp));
orderRoutes.patch("/:orderId/collect", asyncHandler(orderController.collect));

orderRoutes.post("/:orderId/remind", asyncHandler(orderController.remind));
orderRoutes.patch("/:orderId/rack", asyncHandler(orderController.updateRack));
orderRoutes.delete("/:orderId", asyncHandler(orderController.remove));

orderRoutes.get("/:orderId", asyncHandler(orderController.getByOrderId));
