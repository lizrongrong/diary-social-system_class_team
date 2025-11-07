// Simple in-memory email verification code manager (TTL-based).
// Purpose: in development we print the code to the backend terminal for manual testing.

// Map email -> { code, expiresAt }
const store = new Map();
// Map email -> verifiedUntil (timestamp)
const verified = new Map();

// TTL in milliseconds (10 minutes)
const TTL = 10 * 60 * 1000;

function generateCode() {
  // 6-digit numeric code
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationCode(email) {
  const code = generateCode();
  const expiresAt = Date.now() + TTL;
  store.set(email, { code, expiresAt });

  // Print code to server terminal for local testing (no SMTP configured)
  const ts = new Date().toISOString();
  console.log(`[emailVerification] [${ts}] code=${code} -> ${email} (expires in ${Math.round(TTL/60000)}m)`);

  return { ok: true };
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
  isEmailVerified
};
