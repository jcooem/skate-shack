import "server-only";
import { Resend } from "resend";

type Email = { to: string; subject: string; text: string; html: string };

let resend: Resend | null = null;

/**
 * Sends a transactional email through Resend. When RESEND_API_KEY is not set
 * (local development), the email is printed to the server console instead so
 * you can click the link from your terminal.
 */
export async function sendEmail(email: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `\n──── EMAIL (not sent: RESEND_API_KEY not set) ────\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n──────────────────────────────────────────────────\n`,
    );
    return;
  }
  resend ??= new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "Skate Shack <onboarding@resend.dev>";
  const { error } = await resend.emails.send({ from, ...email });
  if (error) {
    console.error("Failed to send email", error);
    throw new Error("We couldn't send the email. Please try again shortly.");
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A simple, client-safe email with one call-to-action button. */
export function actionEmail(opts: { businessName: string; heading: string; body: string; cta: string; url: string }) {
  const { businessName, heading, body, cta, url } = opts;
  const text = `${heading}\n\n${body}\n\n${cta}: ${url}\n\nIf you didn't request this, you can ignore this email.\n\n— ${businessName}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:14px;font-weight:bold;color:#0369a1;letter-spacing:.04em;text-transform:uppercase">${escapeHtml(businessName)}</td></tr>
<tr><td style="padding-top:12px;font-size:22px;font-weight:bold">${escapeHtml(heading)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.5;color:#334155">${escapeHtml(body)}</td></tr>
<tr><td style="padding-top:24px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0369a1;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">${escapeHtml(cta)}</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#64748b">If the button doesn't work, paste this link into your browser:<br>${escapeHtml(url)}</td></tr>
<tr><td style="padding-top:16px;font-size:12px;color:#64748b">If you didn't request this, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}
