import crypto from "node:crypto";

const BASE_URL = "https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment";
const INTEGRATOR_ID = 31;
const TERMINAL_ID = "abcde";

export interface CardAuthRequest {
  cardNumber: string;
  customerId: string;
  paymentMethod: "tdc" | "tdd";
}

export interface CardAuthResponse {
  success: boolean;
  authReference?: string;
  message?: string;
  error?: string;
}

export interface CardPayRequest {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  customerId: string;
  paymentMethod: "tdc" | "tdd";
  otp: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  accountType?: "cc" | "ca";
}

export interface CardPayResponse {
  success: boolean;
  transactionId?: string;
  paymentReference?: string;
  error?: string;
}

function encryptField(plaintext: string): string {
  const key = process.env.MERCANTIL_CARD_ENCRYPTION_KEY;
  if (!key) throw new Error("MERCANTIL_CARD_ENCRYPTION_KEY not configured");
  const hash = crypto.createHash("sha256").update(key, "utf-8").digest("hex");
  const firstHalf = hash.slice(0, hash.length / 2);
  const aesKey = Buffer.from(firstHalf, "hex");
  const cipher = crypto.createCipheriv("aes-128-ecb", aesKey, null);
  let encrypted = cipher.update(plaintext, "utf-8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

function getClientIdentify() {
  return {
    ipaddress: "127.0.0.1",
    browser_agent: "Node.js",
    mobile: { manufacturer: "Generic" },
  };
}

function getMerchantIdentify() {
  return {
    integratorId: INTEGRATOR_ID,
    merchantId: Number(process.env.MERCANTIL_MERCHANT_ID) || 200284,
    terminalId: TERMINAL_ID,
  };
}

function getApiHeaders() {
  const clientId = process.env.MERCANTIL_CLIENT_ID;
  if (!clientId) throw new Error("MERCANTIL_CLIENT_ID not configured");
  return {
    "Content-Type": "application/json",
    "X-IBM-Client-Id": clientId,
  };
}

export async function requestAuth(data: CardAuthRequest): Promise<CardAuthResponse> {
  try {
    const body = {
      merchant_identify: getMerchantIdentify(),
      client_identify: getClientIdentify(),
      transaction_authInfo: {
        trx_type: "solaut",
        payment_method: data.paymentMethod,
        customer_id: data.customerId,
        card_number: data.cardNumber,
      },
    };

    const response = await fetch(`${BASE_URL}/getauth`, {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(text);
    } catch {
      // response is not JSON
    }

    if (!response.ok) {
      console.error("getauth error response:", response.status, text);
      return {
        success: false,
        error: text || `Auth request failed: ${response.status}`,
      };
    }

    const authRef =
      (result.authReference as string) ||
      (result.reference as string) ||
      (result.transactionId as string) ||
      (result.id as string) ||
      (result.status as string);
    const respMsg =
      (result.message as string) ||
      ((result.response as Record<string, unknown>)?.message as string) ||
      "OTP sent to customer phone";
    return {
      success: true,
      authReference: authRef,
      message: respMsg,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to request auth",
    };
  }
}

export async function confirmPayment(data: CardPayRequest): Promise<CardPayResponse> {
  try {
    const transaction: Record<string, unknown> = {
      trx_type: "compra",
      payment_method: data.paymentMethod,
      customer_id: data.customerId,
      card_number: data.cardNumber,
      expiration_date: data.expirationDate,
      cvv: encryptField(data.cvv),
      invoice_number: data.invoiceNumber,
      currency: data.currency,
      amount: data.amount,
    };

    if (data.paymentMethod === "tdd") {
      transaction.account_type = data.accountType || "cc";
    }

    if (data.otp) {
      transaction.twofactor_auth = encryptField(data.otp);
    }

    const body = {
      merchant_identify: getMerchantIdentify(),
      client_identify: getClientIdentify(),
      transaction,
    };

    const response = await fetch(`${BASE_URL}/pay`, {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let result: Record<string, unknown> = {};
    try {
      result = JSON.parse(text);
    } catch {
      // response is not JSON
    }

    if (!response.ok) {
      console.error("pay error response:", response.status, text);
      return {
        success: false,
        error: text || `Payment failed: ${response.status}`,
      };
    }

    return {
      success: true,
      transactionId: (result.transactionId as string) || (result.id as string) || (result.paymentId as string),
      paymentReference:
        (result.paymentReference as string) || (result.reference as string) || (result.referenceNumber as string),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process payment",
    };
  }
}
