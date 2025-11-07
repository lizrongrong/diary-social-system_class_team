// Redacted copy of src/config/database.js for safe sharing
module.exports = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || '<REDACTED>',
  password: process.env.DB_PASSWORD || '<REDACTED>',
  database: process.env.DB_NAME || 'dary_app',
  // other config fields omitted for brevity
};

// NOTE: This file is a redacted, share-safe version. Do not use it to run the app.
