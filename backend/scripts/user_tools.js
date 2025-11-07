#!/usr/bin/env node
// Dev-only CLI: user_tools
// Usage:
//   node user_tools.js dupes
//   node user_tools.js find <email>
//   node user_tools.js compare <email> <plainPassword>
// This script is intended for local development and debugging only. Do NOT run on production without review.

const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function findDuplicates() {
  try {
    const [rows] = await pool.query(
      `SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING cnt > 1 ORDER BY cnt DESC`
    );
    if (!rows || rows.length === 0) {
      console.log('No duplicate emails found.');
      return;
    }
    console.log('Duplicate emails:');
    rows.forEach((r) => console.log(`${r.email} -> ${r.cnt}`));
  } catch (err) {
    console.error('Error checking duplicates:', err.message || err);
    process.exitCode = 2;
  }
}

async function findUser(email) {
  try {
    const [rows] = await pool.query('SELECT user_id, email, password_hash, status, username, role, created_at FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows || rows.length === 0) {
      console.log('NOT_FOUND');
      return;
    }
    // mask password_hash for safety in logs
    const u = rows[0];
    u.password_hash = u.password_hash ? (u.password_hash.slice(0, 6) + '...') : null;
    console.log(JSON.stringify(u, null, 2));
  } catch (err) {
    console.error('Error finding user:', err.message || err);
    process.exitCode = 2;
  }
}

async function comparePassword(email, plain) {
  try {
    const [rows] = await pool.query('SELECT user_id, email, password_hash, status FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows || rows.length === 0) {
      console.log('NOT_FOUND');
      return;
    }
    const user = rows[0];
    const ok = await bcrypt.compare(plain, user.password_hash);
    console.log(ok ? 'MATCH' : 'NO_MATCH');
  } catch (err) {
    console.error('Error comparing password:', err.message || err);
    process.exitCode = 2;
  }
}

function printUsage() {
  console.log('user_tools - dev CLI');
  console.log('Usage:');
  console.log('  node user_tools.js dupes');
  console.log('  node user_tools.js find <email>');
  console.log('  node user_tools.js compare <email> <plainPassword>');
  console.log('\nNote: This is a development-only tool. It may access sensitive data.');
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd) {
    printUsage();
    process.exit(0);
  }

  if (cmd === 'dupes') {
    await findDuplicates();
  } else if (cmd === 'find') {
    const email = argv[1];
    if (!email) { printUsage(); process.exit(1); }
    await findUser(email);
  } else if (cmd === 'compare') {
    const email = argv[1];
    const plain = argv[2];
    if (!email || !plain) { printUsage(); process.exit(1); }
    await comparePassword(email, plain);
  } else {
    printUsage();
    process.exit(1);
  }

  try { pool.end && pool.end(); } catch (e) {}
}

main();
