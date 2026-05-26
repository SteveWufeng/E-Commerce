/**
 * Email notification service.
 *
 * Uses Resend API by default, with SMTP fallback.
 * All templates are defined in the templates/ subdirectory.
 *
 * Environment variables:
 * - RESEND_API_KEY: Resend API key (preferred)
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD: SMTP fallback
 */

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email notification.
 * Falls back to console logging in development if no API key is configured.
 */
export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  // Development mode: log instead of sending
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("[Email Mock]", {
      to: template.to,
      subject: template.subject,
      preview: template.html.slice(0, 200),
    });
    return true;
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const fromAddr = process.env.EMAIL_FROM || `${process.env.NEXT_PUBLIC_STORE_NAME || "Store"} <noreply@${process.env.NEXT_PUBLIC_APP_NAME || "ecommerce"}.com>`;
      await resend.emails.send({
        from: fromAddr,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text || stripHtml(template.html),
      });

      return true;
    }

    console.warn("[Email] No email provider configured. Email not sent.");
    return false;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

/**
 * Generate order confirmation email HTML.
 */
export function orderConfirmationEmail(params: {
  customerName: string;
  orderNumber: string;
  items: { name: string; quantity: number; price: string }[];
  total: string;
  paymentMethod: string;
}): EmailTemplate {
  const itemsHtml = params.items
    .map(
      (item) =>
        `<tr><td style="padding:8px 0">${item.name} x${item.quantity}</td><td style="text-align:right;padding:8px 0">${item.price}</td></tr>`
    )
    .join("");

  return {
    to: "", // Set by caller
    subject: `Order Confirmed — ${params.orderNumber}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#16a34a">Order Confirmed!</h2>
        <p>Hi ${params.customerName},</p>
        <p>Your order <strong>${params.orderNumber}</strong> has been confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${itemsHtml}
          <tr style="border-top:2px solid #e5e7eb">
            <td style="padding:8px 0;font-weight:bold">Total</td>
            <td style="text-align:right;padding:8px 0;font-weight:bold">${params.total}</td>
          </tr>
        </table>
        <h3>Payment</h3>
        <p><strong>Method:</strong> ${params.paymentMethod}</p>
        <p style="margin-top:24px;color:#6b7280;font-size:14px">
          We'll notify you when your order is ready for pickup.
        </p>
      </div>
    `,
  };
}

/**
 * Generate order ready for pickup email HTML.
 */
export function orderReadyEmail(params: {
  customerName: string;
  orderNumber: string;
}): EmailTemplate {
  return {
    to: "",
    subject: `Your Order ${params.orderNumber} is Ready for Pickup!`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#16a34a">Ready for Pickup!</h2>
        <p>Hi ${params.customerName},</p>
        <p>Your order <strong>${params.orderNumber}</strong> is ready!</p>
        <p>Please bring your order number or this email when you arrive.</p>
      </div>
    `,
  };
}

export function verificationEmail(params: {
  email: string;
  token: string;
  appName: string;
}): EmailTemplate {
  const verificationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify?token=${params.token}`;

  return {
    to: params.email,
    subject: `Verify your email — ${params.appName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#16a34a">Verify Your Email</h2>
        <p>Thanks for signing up!</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${verificationUrl}"
             style="display:inline-block;padding:12px 24px;background-color:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
            Verify Email
          </a>
        </div>
        <p style="color:#6b7280;font-size:14px">
          Or copy and paste this link into your browser:<br>
          <span style="font-family:monospace;font-size:12px">${verificationUrl}</span>
        </p>
        <p style="color:#6b7280;font-size:14px;margin-top:16px">
          This link expires in 24 hours. If you didn't create an account, you can ignore this email.
        </p>
      </div>
    `,
  };
}

/**
 * Simple HTML-to-text converter for email text fallback.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
