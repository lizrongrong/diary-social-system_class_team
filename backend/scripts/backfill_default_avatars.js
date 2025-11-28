#!/usr/bin/env node

/**
 * Backfill default profile images for existing users.
 * Generates a 300x300 SVG avatar (first character initial) when profile_image is null/empty.
 */

const db = require('../src/config/db');
const { generateAvatarFile } = require('../src/services/avatarGenerator');

const SELECT_USERS_SQL = `
  SELECT user_id, username
  FROM users
  WHERE (profile_image IS NULL OR profile_image = '')
    AND status != 'deleted'
`;

const UPDATE_USER_SQL = `
  UPDATE users
  SET profile_image = ?, updated_at = NOW()
  WHERE user_id = ?
`;

async function backfill() {
    const [users] = await db.query(SELECT_USERS_SQL);

    if (!users.length) {
        console.log('✅ No users require backfill. All profile images are set.');
        return;
    }

    console.log(`🔄 Backfilling avatars for ${users.length} user(s)...`);

    for (const user of users) {
        const seed = user.username || user.user_id;
        // Use generateAvatarFile to create a file on disk and get the URL path
        const avatarPath = generateAvatarFile(seed);
        await db.execute(UPDATE_USER_SQL, [avatarPath, user.user_id]);
        console.log(`  • Updated ${user.user_id} (${seed}) -> ${avatarPath}`);
    }

    console.log('✅ Backfill completed successfully.');
}

async function main() {
    try {
        await backfill();
    } catch (error) {
        console.error('❌ Backfill failed:', error);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

main();