#!/usr/bin/env node
// Quick script to inspect feedbacks using the project's Feedback model
const path = require('path');
// ensure project paths
const root = path.resolve(__dirname, '..');
process.chdir(root);

async function run() {
  try {
    const Feedback = require(path.join(root, 'backend', 'src', 'models', 'Feedback'));
    // Try admin list
    const rows = await Feedback.findAll({ limit: 100, offset: 0 });
    console.log(`Found ${rows.length} feedback(s)`);
    if (rows.length > 0) {
      console.log('Sample entries:');
      rows.slice(0, 10).forEach((r, i) => {
        console.log(`- ${i+1}. id=${r.feedback_id} user_id=${r.user_id} status=${r.status} subject=${(r.subject||'').slice(0,80)}`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('Error inspecting feedbacks:', err && err.message ? err.message : err);
    console.error(err);
    process.exit(2);
  }
}

run();
