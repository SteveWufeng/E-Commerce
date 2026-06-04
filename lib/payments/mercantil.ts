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
  const baseUrl = process.env.MERCANTIL_REDIRECT_URL || 'https://apimbu.mercantilbanco.com/mercantil-banco/prod/v1/payment';

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

  return {
    success: true,
    redirectUrl: `${baseUrl}?${params.toString()}`,
  };
}
