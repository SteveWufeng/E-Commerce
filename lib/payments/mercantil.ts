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
  const integratorId = process.env.INTEGRATOR_ID || '31';
  const baseUrl = process.env.MERCANTIL_REDIRECT_URL;
  const apiUrl = process.env.MERCANTIL_API_URL;

  if (!secret) {
    return { success: false, error: 'DOMINIO_API_SECRET is not configured' };
  }

  const plaintext = JSON.stringify(transactionData);
  const encrypted = encryptTransactionData(plaintext, secret);

  const params = new URLSearchParams({
    merchantid: transactionData.merchantId,
    integratorid: integratorId,
    transactiondata: encrypted,
  });

  // If the bank gave us a direct redirect URL, use it (query params appended)
  if (baseUrl) {
    return {
      success: true,
      redirectUrl: `${baseUrl}?${params.toString()}`,
    };
  }

  // Otherwise POST to the API to get the redirect URL
  if (apiUrl) {
    const clientId = process.env.DOMINIO_API_KEY;
    const appName = process.env.MERCANTIL_APP || 'zewar';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (clientId) headers['X-IBM-Client-ID'] = clientId;

    try {
      const res = await fetch(`${apiUrl}/api?app=${encodeURIComponent(appName)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          merchantid: transactionData.merchantId,
          integratorid: integratorId,
          transactiondata: encrypted,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: `Mercantil API error (${res.status}): ${JSON.stringify(data)}` };
      }

      const redirectUrl = data?.redirectUrl || data?.redirect_url || data?.url;
      if (!redirectUrl) {
        return { success: false, error: `No redirect URL in response: ${JSON.stringify(data)}` };
      }

      return { success: true, redirectUrl };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'API call failed' };
    }
  }

  return { success: false, error: 'Neither MERCANTIL_REDIRECT_URL nor MERCANTIL_API_URL is configured' };
}
