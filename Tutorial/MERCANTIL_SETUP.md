# Mercantil Banco Card Payment Setup

## Environment Variables

Set these in `.env.local` (development) and Railway dashboard (production):

```bash
MERCANTIL_CLIENT_ID=<your-client-id>
MERCANTIL_MERCHANT_ID=<your-merchant-id>
MERCANTIL_CARD_ENCRYPTION_KEY=<your-encryption-key>
```

Values come from the Mercantil approval email. **Do not commit these to git.**

## API Endpoints (Sandbox)

| Endpoint | URL |
|---|---|
| Auth (OTP) | `POST https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment/getauth` |
| Pay | `POST https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment/pay` |

**Headers:** `X-IBM-Client-Id: <your-client-id>`

## Payment Flow

```
TDC (Credit Card):  Pay directly → no OTP
TDD (Debit Card):   getauth first → OTP sent to phone → Pay with OTP
```

## Test Cards (Sandbox)

### Visa

| Card Number | ID (Cédula) | CVV | Expiry |
|---|---|---|---|
| `4532310053032530` | `V10780248` | `924` | 12/25 |
| `4532310053099117` | `V5657320` | `205` | 10/27 |
| `4110960300756107` | `V3058180` | `956` | 09/25 |
| `4110960300817842` | `V8019884` | `330` | 10/27 |

### Mastercard

| Card Number | ID (Cédula) | CVV | Expiry |
|---|---|---|---|
| `5304704300855540` | `V5220945` | `547` | 10/27 |
| `5412470044429658` | `V8083734` | `761` | 10/26 |
| `5412470044730170` | `V3177000` | `605` | 02/27 |
| `5522660000329234` | `V6977637` | `57` | 01/27 |

### Mastercard Debit

| Card Number | ID (Cédula) | CVV | Expiry |
|---|---|---|---|
| `5434642100024805` | `V13332488` | Contact Mercantil for dynamic CVC | 09/28 |

## Input Format

| Field | Format | Example |
|---|---|---|
| Card number | Plain digits | `4532310053032530` |
| ID (Cédula) | Letter + digits, no spaces | `V10780248` |
| Expiry | MM/YY | `12/25` |
| CVV | Plain digits | `924` |

## Architecture

The browser never calls Mercantil directly — all requests go through your Next.js API:

```
Browser → /api/payments/mercantil/pay → Mercantil API
Browser → /api/payments/mercantil/getauth → Mercantil API
```

## Relevant Files

| File | Purpose |
|---|---|
| `lib/payments/mercantil-card.ts` | Mercantil API client (encryption, request building) |
| `app/api/payments/mercantil/pay/route.ts` | `/pay` API route |
| `app/api/payments/mercantil/getauth/route.ts` | `/getauth` API route |
| `app/(customer)/checkout/page.tsx` | Checkout UI with card form |
| `Tutorial/sample-request-getAuth.json` | Sample getauth request |
| `Tutorial/sample-request-Pay.json` | Sample pay request |

## Encryption

CVV and OTP values are encrypted with AES-128-ECB using a derived key:

1. SHA256 the encryption key
2. Take first 16 bytes as AES key
3. Encrypt plaintext with AES-128-ECB, output base64

See `lib/payments/mercantil-card.ts` → `encryptField()` and official reference at https://github.com/apimercantil/encrypt-examples.

## Troubleshooting

| Error | Likely Cause |
|---|---|
| `"Numero de factura muy largo"` | Invoice number > ~12 chars. Uses base36 short IDs. |
| `"Numero de Cedula no es numerico o encriptacion no valida"` | Wrong ID format (use `V10780248` not `V-10780248`) or encryption key mismatch |
| `"MERCANTIL_CLIENT_ID not configured"` | Env var not set on Railway |
