// Redacted test-connection script for sharing
const mysql = require('mysql2/promise');

async function testConnection() {
  const dbPassword = process.env.DB_PASSWORD || '<REDACTED>';
  if (!process.env.DB_PASSWORD) {
    console.log('DB_PASSWORD not set locally; this is a redacted file.');
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: dbPassword
  });

  const [rows] = await connection.query('SELECT VERSION() as version');
  console.log(`MySQL version: ${rows[0].version}`);
  await connection.end();
}

testConnection();
