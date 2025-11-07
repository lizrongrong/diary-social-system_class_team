// Redacted copy of src/config/db.js for safe sharing
module.exports = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || '<REDACTED>',
  password: process.env.DB_PASSWORD || '<REDACTED>',
  database: process.env.DB_NAME || 'resonote',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// NOTE: This file is a redacted, share-safe version. Do not use it to run the app.
