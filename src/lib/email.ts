import "server-only";
import { Resend } from "resend";
import { UserError } from "@/lib/credits";

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
    throw new UserError("We couldn't send the email. Please try again shortly.");
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A simple, client-safe email with one call-to-action button. */
export function actionEmail(opts: {
  businessName: string;
  heading: string;
  body: string;
  cta: string;
  url: string;
  /** Shown in a large monospace box, e.g. a temporary password. */
  code?: { label: string; value: string };
  /** Small print at the bottom. */
  footer?: string;
}) {
  const { businessName, heading, body, cta, url, code } = opts;
  const footer = opts.footer ?? "If you didn't request this, you can ignore this email.";
  const codeText = code ? `\n\n${code.label}: ${code.value}` : "";
  const codeHtml = code
    ? `<tr><td style="padding-top:16px;font-size:13px;color:#334155">${escapeHtml(code.label)}</td></tr>
<tr><td style="padding-top:6px"><div style="display:inline-block;font-family:Consolas,Menlo,monospace;font-size:22px;letter-spacing:.08em;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:10px 16px">${escapeHtml(code.value)}</div></td></tr>`
    : "";
  const text = `${heading}\n\n${body}${codeText}\n\n${cta}: ${url}\n\n${footer}\n\n— ${businessName}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:14px;font-weight:bold;color:#0369a1;letter-spacing:.04em;text-transform:uppercase">${escapeHtml(businessName)}</td></tr>
<tr><td style="padding-top:12px;font-size:22px;font-weight:bold">${escapeHtml(heading)}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.5;color:#334155">${escapeHtml(body)}</td></tr>
${codeHtml}
<tr><td style="padding-top:24px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0369a1;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">${escapeHtml(cta)}</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#64748b">If the button doesn't work, paste this link into your browser:<br>${escapeHtml(url)}</td></tr>
<tr><td style="padding-top:16px;font-size:12px;color:#64748b">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}
