import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

// ─── Config ───────────────────────────────────────────────
const DOMINIO_API_SECRET = process.env.DOMINIO_API_SECRET || '6b11253d59061776ed9817007434545c';
const MERCHANT_RIF       = process.env.MERCHANT_RIF || 'J-99999999-9';  // your RIF
const INTEGRATOR_ID      = process.env.INTEGRATOR_ID || '31';          // optional

// ─── Load transaction data ─────────────────────────────────
const txData = JSON.parse(readFileSync('structure_transaction_data.json', 'utf-8'));

// Update merchantId inside the JSON to match actual RIF
txData.merchantId = txData.merchantId === 'merchant_12345' ? MERCHANT_RIF : txData.merchantId;

const plaintext = JSON.stringify(txData);
console.log('Plaintext JSON:', plaintext);

// ─── Derive AES-128 key ────────────────────────────────────
// 1. SHA-256(secret) → 32 bytes
// 2. Take first 16 bytes → AES key
const hash = crypto.createHash('sha256').update(DOMINIO_API_SECRET, 'utf-8').digest();
const aesKey = hash.subarray(0, 16);
console.log('Derived AES key (hex):', aesKey.toString('hex'));

// ─── Encrypt (AES-128-ECB / PKCS5Padding ≈ PKCS7) ─────────
const cipher = crypto.createCipheriv('aes-128-ecb', aesKey, null);
let encrypted = cipher.update(plaintext, 'utf-8', 'base64');
encrypted += cipher.final('base64');

console.log('\nEncrypted transactiondata (base64):', encrypted);

// ─── Build redirect URL ────────────────────────────────────
const url = `https://buhoya.com/mercantil/botondepagos`
  + `?merchantid=${encodeURIComponent(MERCHANT_RIF)}`
  + `&integratorid=${INTEGRATOR_ID}`
  + `&transactiondata=${encodeURIComponent(encrypted)}`;

console.log('\nFinal redirect URL:');
console.log(url);
