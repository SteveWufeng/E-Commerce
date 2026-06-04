import crypto from 'node:crypto';

export interface MercantilTransactionData {
  amount: number;
  customerName: string;
  returnUrl: string;
  merchantId: string;
  invoiceNumber: {
    number: string;
    invoiceCreationDate: string;
    invoiceCancelledDate?: string;
  };
  contract: {
    contractNumber: string;
    contractDate: string;
  };
  trxType: string;
  currency: string;
  paymentConcepts: string[];
}

export interface MercantilPaymentResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

function deriveAesKey(secret: string): Buffer {
  const hash = crypto.createHash('sha256').update(secret, 'utf-8').digest();
  return hash.subarray(0, 16);
}

function encryptTransactionData(plaintext: string, secret: string): string {
  const aesKey = deriveAesKey(secret);
  const cipher = crypto.createCipheriv('aes-128-ecb', aesKey, null);
  let encrypted = cipher.update(plaintext, 'utf-8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export async function generateMercantilRedirect(
  transactionData: MercantilTransactionData
): Promise<MercantilPaymentResult> {
  const secret = process.env.DOMINIO_API_SECRET;
  const clientId = process.env.DOMINIO_API_KEY;
  const appName = process.env.MERCANTIL_APP || 'zewar';

  if (!secret) {
    return { success: false, error: 'DOMINIO_API_SECRET is not configured' };
  }

  const apiBase = process.env.MERCANTIL_API_URL || 'https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment';
  const apiUrl = `${apiBase}/api?app=${encodeURIComponent(appName)}`;

  const plaintext = JSON.stringify(transactionData);
  const encrypted = encryptTransactionData(plaintext, secret);

  const body = {
    merchantid: transactionData.merchantId,
    integratorid: process.env.INTEGRATOR_ID || '31',
    transactiondata: encrypted,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (clientId) {
    headers['X-IBM-Client-ID'] = clientId;
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: `Mercantil API error (${res.status}): ${JSON.stringify(data)}`,
      };
    }

    const redirectUrl = data?.redirectUrl || data?.redirect_url || data?.url;
    if (!redirectUrl) {
      return {
        success: false,
        error: `Mercantil API did not return a redirect URL: ${JSON.stringify(data)}`,
      };
    }

    return { success: true, redirectUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to call Mercantil API',
    };
  }
}
