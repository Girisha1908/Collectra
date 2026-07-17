import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { asyncHandler } from "../util/asyncHandler.js";

export const authRoutes = Router();

authRoutes.post("/register", asyncHandler(authController.register));
authRoutes.post("/login", asyncHandler(authController.login));
