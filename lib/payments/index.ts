/**
 * Payment processing module.
 *
 * Currently operates in MOCK mode for development and testing.
 * When MOCK_PAYMENTS=false, real Stripe integration is activated.
 *
 * Supported mock methods:
 * - Credit Card
 * - Google Pay
 * - PayPal
 * - Cash on Pickup
 *
 * To enable real payments:
 * 1. Set MOCK_PAYMENTS=false in .env.local
 * 2. Add valid STRIPE_SECRET_KEY
 * 3. Implement Stripe webhook handler in /api/payments/webhook
 */

import type { PaymentMethod } from "@/types";

export interface PaymentRequest {
  amount: number; // in cents
  currency: string;
  method: PaymentMethod;
  orderId: string;
  customerEmail: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Process a payment. In mock mode, always succeeds after a simulated delay.
 * In production mode, delegates to Stripe.
 */
export async function processPayment(
  request: PaymentRequest
): Promise<PaymentResult> {
  if (process.env.MOCK_PAYMENTS === "true") {
    return processMockPayment(request);
  }

  return processStripePayment(request);
}

/**
 * Mock payment processor — simulates a successful transaction.
 * Adds a realistic delay and generates a deterministic transaction ID.
 */
async function processMockPayment(
  request: PaymentRequest
): Promise<PaymentResult> {
  // Simulate network delay (300-800ms)
  await new Promise((resolve) =>
    setTimeout(resolve, 300 + Math.random() * 500)
  );

  // 95% success rate simulation for realistic testing
  if (Math.random() > 0.95) {
    return {
      success: false,
      transactionId: "",
      error: "Payment declined by issuer. Please try another method.",
    };
  }

  const transactionId = `mock_txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    success: true,
    transactionId,
    paymentIntentId: `pi_mock_${Date.now()}`,
  };
}

/**
 * Real Stripe payment processor.
 * Requires valid STRIPE_SECRET_KEY in environment.
 */
async function processStripePayment(
  request: PaymentRequest
): Promise<PaymentResult> {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency || "usd",
      metadata: {
        orderId: request.orderId,
        customerEmail: request.customerEmail,
        paymentMethod: request.method,
      },
    });

    return {
      success: true,
      transactionId: paymentIntent.id,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown payment error";
    return {
      success: false,
      transactionId: "",
      error: message,
    };
  }
}

/**
 * Validate that a payment method string is supported.
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ["CREDIT_CARD", "GOOGLE_PAY", "PAYPAL", "CASH_ON_PICKUP"].includes(method);
}
