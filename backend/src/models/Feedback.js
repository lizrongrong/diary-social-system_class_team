const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_PAGE_SIZE = 50;
const REQUIRED_CATEGORIES = ['general', 'feature', 'account', 'diary', 'followers', 'card', 'analysis', 'other'];

let ensuredCategoryEnum = false;

const ensureCategoryEnum = async () => {
  if (ensuredCategoryEnum) return;
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM feedbacks LIKE 'category'");
    if (Array.isArray(rows) && rows.length > 0) {
      const type = rows[0].Type || '';
      const missing = REQUIRED_CATEGORIES.filter((value) => !type.includes(`'${value}'`));
      if (missing.length > 0 || /'bug'|'complaint'/.test(type)) {
        const legacyMappings = {
          bug: 'feature',
          complaint: 'other'
        };

        await Promise.all(
          Object.entries(legacyMappings).map(([legacy, modern]) =>
            db.execute('UPDATE feedbacks SET category = ? WHERE category = ?', [modern, legacy])
          )
        ).catch((error) => {
          console.warn('Unable to remap legacy feedback categories:', error && error.message ? error.message : error);
        });

        const enumValues = REQUIRED_CATEGORIES.map((value) => `'${value}'`).join(', ');
        const sql = `ALTER TABLE feedbacks MODIFY category ENUM(${enumValues}) NOT NULL COMMENT '問題類別'`;
        await db.execute(sql);
      }
    }
    ensuredCategoryEnum = true;
  } catch (error) {
    console.warn('Unable to ensure feedback category enum:', error && error.message ? error.message : error);
  }
};

class Feedback {
  static async create(payload) {
    await ensureCategoryEnum();
    const feedbackId = uuidv4();
    const query = `
      INSERT INTO feedbacks (
        feedback_id,
        user_id,
        category,
        subject,
        description
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      feedbackId,
      payload.user_id,
      payload.category,
      payload.subject,
      payload.description
    ];

    await db.execute(query, values);
    return feedbackId;
  }

  static async findByUser(userId, options = {}) {
    const limit = Math.max(1, Math.min(Number(options.limit) || DEFAULT_PAGE_SIZE, 100));
    const offset = Math.max(0, Number(options.offset) || 0);

    const query = `
      SELECT feedback_id, category, subject, description, status, admin_reply, created_at, updated_at, resolved_at
      FROM feedbacks
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(query, [userId, limit, offset]);
    return rows;
  }
}

module.exports = Feedback;