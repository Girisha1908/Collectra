import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { Request, Response } from "express";
import { HttpError } from "../middleware/errorHandler.js";
import * as orderModel from "../models/orderModel.js";
import * as qrService from "../services/qrService.js";
import * as smsService from "../services/smsService.js";
import { parseTenDigitPhone } from "../util/phone.js";



export async function listOrders(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit as string) || 200));
  const offset = (page - 1) * limit;

  const rows = await orderModel.listOrders(limit, offset);
  res.json(rows);
}

export async function getByOrderId(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  if (!orderId) {
    throw new HttpError(400, "orderId is required");
  }
  const row = await orderModel.findByPublicOrderId(orderId);
  if (!row) {
    throw new HttpError(404, "order not found");
  }
  res.json(row);
}

export async function getPublicOrderDetails(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  if (!orderId) {
    throw new HttpError(400, "orderId is required");
  }
  console.log(`[Public API] Fetching details for Order ID: ${orderId}`);
  const row = await orderModel.findByPublicOrderId(orderId);
  if (!row) {
    console.warn(`[Public API] Order not found for ID: ${orderId}`);
    throw new HttpError(404, "order not found");
  }
  
  let qrCode = row.qr_code_base64;
  if (!qrCode) {
    console.log(`[Public API] Generating missing QR code dynamically for: ${row.order_id}`);
    qrCode = await qrService.generateQrDataUrl(row.order_id);
  }

  res.json({
    order_id: row.order_id,
    created_at: row.created_at,
    rack_number: row.rack_number,
    qr_code_base64: qrCode,
    status: row.status,
  });
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const uid = req.user?.id;
  if (!uid) {
    throw new HttpError(401, "unauthorized");
  }
  const body = req.body as {
    receiver_name?: string;
    phone_number?: string;
    description?: string;
    location?: string;
    rack_number?: string;
  };
  const receiver_name = body.receiver_name?.trim();
  if (!receiver_name) {
    throw new HttpError(400, "receiver_name is required");
  }
  const rawPhone =
    typeof body.phone_number === "number" ? String(body.phone_number) : (body.phone_number ?? "").trim();
  if (!rawPhone) {
    throw new HttpError(400, "phone_number is required");
  }
  const phone_number = parseTenDigitPhone(rawPhone);

  console.log(`[Order Intake] Creating order for receiver: "${receiver_name}", phone: ${phone_number}`);

  let order_id = await orderModel.getNextOrderId();
  console.log(`[Order Intake] Candidate Order ID generated: ${order_id}`);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await orderModel.findByPublicOrderId(order_id);
    if (!clash) break;
    console.warn(`[Order Intake] Collision detected for ID: ${order_id}. Incrementing and retrying...`);
    const numPart = order_id.substring(3);
    const nextNum = parseInt(numPart, 10) + 1;
    order_id = `ORD${String(nextNum).padStart(6, "0")}`;
  }
  
  // Guard: if we still clash after 5 attempts, fail cleanly
  const finalClash = await orderModel.findByPublicOrderId(order_id);
  if (finalClash) {
    console.error(`[Order Intake] Persistent collision failed to resolve for candidate ${order_id}`);
    throw new HttpError(500, "Could not generate a unique order ID. Please retry.");
  }

  console.log(`[Order Intake] Using final unique Order ID: ${order_id}`);
  const qr = await qrService.generateQrDataUrl(order_id);
  console.log(`[Order Intake] Generated QR data URL encoding exactly: ${order_id}`);

  const row = await orderModel.insertOrder({
    order_id,
    receiver_name,
    phone_number,
    description: body.description ?? null,
    location: body.location ?? null,
    rack_number: body.rack_number ?? null,
    qr_code_base64: qr,
    created_by: uid,
  });

  try {
    await smsService.sendOrderIntakeNotification(String(phone_number), order_id);
  } catch (smsErr: any) {
    console.error(`[Order Intake] SMS notification failed for Order ID: ${order_id}`, smsErr);
  }

  res.status(201).json(row);
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  if (!orderId) {
    throw new HttpError(400, "orderId is required");
  }
  console.log(`[OTP Service] Initiating OTP send for Order ID: ${orderId}`);
  const row = await orderModel.findByPublicOrderId(orderId);
  if (!row) {
    console.warn(`[OTP Service] Order not found for ID: ${orderId}`);
    throw new HttpError(404, "order not found");
  }
  if (row.status === "collected") {
    console.warn(`[OTP Service] Attempted to send OTP for already-collected order: ${orderId}`);
    throw new HttpError(400, "order already collected");
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Hash OTP before storing — never keep plaintext codes in the DB
  const codeHash = await bcrypt.hash(code, 10);

  const updated = await orderModel.setOtpForOrder(orderId, codeHash, expiresAt);
  if (!updated) {
    console.error(`[OTP Service] Database failed to store OTP hash for order: ${orderId}`);
    throw new HttpError(500, "failed to save OTP");
  }

  console.log(`[OTP Service] OTP stored successfully. Sending SMS to recipient...`);
  await smsService.sendOtpSms(String(row.phone_number), code);

  res.json({
    order_id: orderId,
    otp_expires_at: expiresAt.toISOString(),
  });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  const body = req.body as { code?: string };
  const raw = body.code?.trim() ?? "";
  if (!orderId) {
    throw new HttpError(400, "orderId is required");
  }
  if (!/^\d{6}$/.test(raw)) {
    throw new HttpError(400, "code must be a 6-digit string");
  }

  console.log(`[OTP Verification] Verifying OTP code for Order ID: ${orderId}`);
  const row = await orderModel.findByPublicOrderId(orderId);
  if (!row) {
    console.warn(`[OTP Verification] Order not found for ID: ${orderId}`);
    throw new HttpError(404, "order not found");
  }
  if (!row.otp_code || !row.otp_expires_at) {
    console.warn(`[OTP Verification] Verification failed: No OTP has been sent for order ${orderId}`);
    throw new HttpError(400, "no OTP sent for this order");
  }
  if (new Date() > new Date(row.otp_expires_at)) {
    console.warn(`[OTP Verification] Verification failed: OTP has expired for order ${orderId}`);
    throw new HttpError(400, "OTP expired");
  }

  // Brute-force lockout: max 5 attempts per OTP
  const MAX_ATTEMPTS = 5;
  if ((row.otp_attempts ?? 0) >= MAX_ATTEMPTS) {
    console.warn(`[OTP Verification] Verification blocked: Max attempts (${MAX_ATTEMPTS}) exceeded for order ${orderId}`);
    throw new HttpError(429, "Too many incorrect attempts. Please request a new OTP.");
  }

  const codeMatch = await bcrypt.compare(raw, row.otp_code);
  if (!codeMatch) {
    await orderModel.incrementOtpAttempts(orderId);
    const remaining = MAX_ATTEMPTS - ((row.otp_attempts ?? 0) + 1);
    console.warn(`[OTP Verification] Verification failed: Invalid code entered for order ${orderId}. Remaining attempts: ${remaining}`);
    throw new HttpError(403, `Invalid code. ${remaining} attempt(s) remaining.`);
  }

  const updated = await orderModel.setOtpVerified(orderId);
  if (!updated) {
    console.error(`[OTP Verification] Database failed to set otp_verified to true for order: ${orderId}`);
    throw new HttpError(500, "failed to verify OTP");
  }

  console.log(`[OTP Verification] OTP successfully verified for Order ID: ${orderId}`);
  res.json({ order_id: orderId, otp_verified: true });
}

export async function collect(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  if (!orderId) {
    throw new HttpError(400, "orderId is required");
  }
  console.log(`[Order Pickup] Processing pickup collection for Order ID: ${orderId}`);
  const row = await orderModel.findByPublicOrderId(orderId);
  if (!row) {
    console.warn(`[Order Pickup] Order not found for ID: ${orderId}`);
    throw new HttpError(404, "order not found");
  }
  if (!row.otp_verified) {
    console.warn(`[Order Pickup] Pickup blocked: OTP not verified for order ${orderId}`);
    throw new HttpError(400, "OTP must be verified before collection");
  }

  const updated = await orderModel.collectOrder(orderId);
  if (!updated) {
    console.error(`[Order Pickup] Database failed to record collection for order: ${orderId}`);
    throw new HttpError(400, "cannot collect — check status or OTP");
  }

  console.log(`[Order Pickup] Collection registered in DB for: ${orderId}. Dispatching collection SMS...`);
  // Send notification — intentionally non-blocking so a Twilio hiccup
  // doesn't roll back an already-recorded collection.
  smsService.sendOrderCollectedNotification(String(row.phone_number), orderId).catch((err) => {
    console.error(`[Order Pickup] Collection notification SMS failed for order: ${orderId}`, err);
  });

  res.json(updated);
}

export async function remind(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  if (!orderId) throw new HttpError(400, "orderId is required");
  const row = await orderModel.findByPublicOrderId(orderId);
  if (!row) throw new HttpError(404, "order not found");
  
  await smsService.sendReminderSms(String(row.phone_number), orderId);
  await orderModel.updateLastReminded(orderId);
  res.json({ success: true, message: "Reminder sent" });
}

export async function updateRack(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  const { rack } = req.body as { rack?: string };
  if (!orderId) throw new HttpError(400, "orderId is required");
  if (!rack) throw new HttpError(400, "rack is required");
  
  const updated = await orderModel.updateOrderRack(orderId, rack);
  if (!updated) throw new HttpError(404, "order not found");
  res.json({ success: true, rack: updated.rack_number });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  if (!orderId) throw new HttpError(400, "orderId is required");
  
  const deleted = await orderModel.deleteOrder(orderId);
  if (!deleted) throw new HttpError(404, "order not found");
  res.json({ success: true });
}
