/**
 * SMS notification service via Twilio.
 *
 * Gracefully degrades to console logging in development
 * or when Twilio credentials are not configured.
 */

export interface SmsTemplate {
  to: string;
  body: string;
}

/**
 * Send an SMS notification.
 * Falls back to console logging in development.
 */
export async function sendSms(template: SmsTemplate): Promise<boolean> {
  // Development mode: log instead of sending
  if (process.env.NODE_ENV === "development" && !process.env.TWILIO_ACCOUNT_SID) {
    console.log("[SMS Mock]", {
      to: template.to,
      body: template.body,
    });
    return true;
  }

  try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const twilio = await import("twilio");
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await client.messages.create({
        body: template.body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: template.to,
      });

      return true;
    }

    console.warn("[SMS] No SMS provider configured. Message not sent.");
    return false;
  } catch (error) {
    console.error("[SMS] Failed to send SMS:", error);
    return false;
  }
}

/**
 * Generate order confirmation SMS text.
 */
export function orderConfirmationSms(params: {
  orderNumber: string;
}): SmsTemplate {
  return {
    to: "", // Set by caller
    body:
      `Order ${params.orderNumber} confirmed! ` +
      `We'll notify you when it's ready for pickup.`,
  };
}

/**
 * Generate order ready SMS text.
 */
export function orderReadySms(params: {
  orderNumber: string;
  storeAddress: string;
}): SmsTemplate {
  return {
    to: "",
    body:
      `Your order ${params.orderNumber} is ready for pickup! ` +
      `Location: ${params.storeAddress}. ` +
      `Please bring this message or your order number.`,
  };
}
