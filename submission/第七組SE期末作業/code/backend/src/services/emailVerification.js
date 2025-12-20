// Email verification manager (in-memory, TTL-based) with optional SMTP sending.
// Generates 6-character alphanumeric codes and will send via SMTP if configured.
const nodemailer = require('nodemailer');

// Map email -> { code, expiresAt }
const store = new Map();
// Map email -> verifiedUntil (timestamp)
const verified = new Map();
// reset codes store
const resetStore = new Map();

// TTL in milliseconds (10 minutes)
const TTL = 10 * 60 * 1000;

// Read SMTP config from env
const SMTP_HOST = process.env.MAIL_HOST;
const SMTP_PORT = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined;
const SMTP_USER = process.env.MAIL_USER;
const SMTP_PASS = process.env.MAIL_PASSWORD;
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@example.com';

let transporter = null;
if (SMTP_HOST && SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });
}
// If no SMTP configured, we will NOT silently fall back to Ethereal.
// The system requires real SMTP for sending to real recipients.
// For local development you can still configure SMTP or inspect server logs.
let usingTestAccount = false;
function generateCode() {
  // 6-character alphanumeric (A-Z a-z 0-9)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function sendMail(email, subject, text, html) {
  if (!transporter) {
    // Do not silently fallback to a test account when no SMTP is configured.
    // The caller expects real delivery to recipient addresses.
    const msg = 'SMTP not configured. Set MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASSWORD to send real emails.';
    console.error('[emailVerification] sendMail failed:', msg);
    throw new Error(msg);
  }

  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject,
    text,
    html
  });

  // If transporter successfully sent message, return reply info
  return { ok: true, info };
}

// Try to verify SMTP transporter connectivity if using real SMTP.
// Returns { ok: true, info } or { ok: false, error }
async function initMailer() {
  if (!transporter) {
    console.log('[emailVerification] No SMTP transporter configured; will lazily create test account when sending.');
    return { ok: false, info: 'no-transporter' };
  }

  try {
    // transporter.verify() returns a promise for nodemailer
    const verified = await transporter.verify();
    console.log('[emailVerification] SMTP transporter verified:', verified);
    return { ok: true, info: verified };
  } catch (err) {
    console.error('[emailVerification] Failed to verify SMTP transporter:', err && err.message ? err.message : err);
    return { ok: false, error: err };
  }
}

async function sendVerificationCode(email) {
  const code = generateCode();
  const expiresAt = Date.now() + TTL;
  store.set(email, { code, expiresAt });

  const subject = 'Your verification code';
  const text = `Your verification code is: ${code}\nThis code will expire in ${Math.round(TTL / 60000)} minutes.`;
  const html = `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in ${Math.round(TTL / 60000)} minutes.</p>`;

  try {
    const result = await sendMail(email, subject, text, html);
    const ts = new Date().toISOString();
    console.log(`[emailVerification] [${ts}] code=${code} -> ${email} (expires in ${Math.round(TTL / 60000)}m) mail=${result && result.emulated ? 'EMULATED' : 'SENT'}`);
    // Return send result so callers can surface preview URLs when available
    return { ok: true, code, expiresAt, mail: result };
  } catch (err) {
    console.error('Failed to send verification email:', err);
    // still keep code in store for manual testing
  }

  return { ok: true, code, expiresAt };
}

async function verifyCode(email, code) {
  const entry = store.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return false;
  }
  if (String(code) === String(entry.code)) {
    store.delete(email);
    // mark as recently verified (allow registration within short window)
    verified.set(email, Date.now() + TTL);
    return true;
  }
  return false;
}

// Password reset code functions (separate store)
async function sendResetCode(email) {
  const code = generateCode();
  const expiresAt = Date.now() + TTL;
  resetStore.set(email, { code, expiresAt });
  const subject = 'Your password reset code';
  const text = `Your password reset code is: ${code}\nThis code will expire in ${Math.round(TTL / 60000)} minutes.`;
  const html = `<p>Your password reset code is: <strong>${code}</strong></p><p>This code will expire in ${Math.round(TTL / 60000)} minutes.</p>`;
  try {
    await sendMail(email, subject, text, html);
    const ts = new Date().toISOString();
    console.log(`[emailVerification][RESET] [${ts}] code=${code} -> ${email} (expires in ${Math.round(TTL / 60000)}m)`);
  } catch (err) {
    console.error('Failed to send reset email:', err);
  }
  return { ok: true };
}

async function verifyResetCode(email, code) {
  const entry = resetStore.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    resetStore.delete(email);
    return false;
  }
  if (String(code) === String(entry.code)) {
    // do NOT delete here so the same code can be used to perform the reset
    return true;
  }
  return false;
}

function consumeResetCode(email) {
  resetStore.delete(email);
}

function isEmailVerified(email) {
  const exp = verified.get(email);
  if (!exp) return false;
  if (Date.now() > exp) {
    verified.delete(email);
    return false;
  }
  return true;
}

module.exports = {
  sendVerificationCode,
  verifyCode,
  isEmailVerified,
  sendResetCode,
  verifyResetCode,
  consumeResetCode
  , initMailer
};

