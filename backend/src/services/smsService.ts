import twilio from "twilio";

/**
 * SMS notifications. Dev: console. Prod: set Twilio env vars (implement send in Phase 4+).
 */
export async function sendOrderIntakeNotification(phone: string, orderId: string): Promise<void> {
  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:9002";
  const body = `Collectra: Order received and stored. Order ID: ${orderId}. Use this ID/QR to collect your order: ${baseUrl}/order/${orderId}`;
  await deliverSms(phone, body);
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const body = `Collectra: Your pickup code is ${code}. Valid 5 minutes.`;
  await deliverSms(phone, body);
}

export async function sendOrderCollectedNotification(phone: string, orderId: string): Promise<void> {
  const body = `Collectra: Your order (ID: ${orderId}) has been successfully collected from secure storage. If this was not you, contact security immediately.`;
  await deliverSms(phone, body);
}

export async function sendReminderSms(phone: string, orderId: string, isOverdue = false): Promise<void> {
  const overdueStr = isOverdue ? " [OVERDUE]" : "";
  const body = `Collectra: Gentle reminder — your order is securely stored${overdueStr}. Please collect it at your earliest convenience.\nOrder ID: ${orderId}`;
  await deliverSms(phone, body);
}

async function deliverSms(phone: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from || process.env.SMS_MOCK === "true") {
    console.log(`[sms mock] -> ${phone}: ${body}`);
    return;
  }

  const client = twilio(sid, token);
  
  // Twilio requires E.164 format (e.g. +91 for India)
  let targetPhone = phone;
  if (/^\d{10}$/.test(targetPhone)) {
    targetPhone = `+91${targetPhone}`;
  }

  try {
    const message = await client.messages.create({
      body: body,
      from: from,
      to: targetPhone,
    });
    console.log(`[sms sent] -> ${targetPhone} (SID: ${message.sid})`);
  } catch (error: any) {
    console.error("[sms error] Failed to send via Twilio:", error);
    throw new Error(`Failed to send SMS: ${error.message || "Unknown error"}`);
  }
}
