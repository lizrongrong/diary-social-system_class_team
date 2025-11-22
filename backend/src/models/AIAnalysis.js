const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AIAnalysis {
  static async findByDiaryId(diaryId) {
    const [rows] = await db.execute('SELECT * FROM ai_analysis WHERE diary_id = ?', [diaryId]);
    return rows[0] || null;
  }

  static async createOrUpdate(diaryId, payload = {}) {
    // try update existing
    const existing = await AIAnalysis.findByDiaryId(diaryId);
    if (existing) {
      const fields = [];
      const values = [];
      for (const key of ['emotion_score', 'dominant_emotion', 'keywords', 'summary', 'suggestion', 'analyzed_at', 'model_version', 'status']) {
        if (payload[key] !== undefined) {
          fields.push(`${key} = ?`);
          // stringify JSON-like fields
          if (key === 'emotion_score' || key === 'keywords') {
            values.push(typeof payload[key] === 'string' ? payload[key] : JSON.stringify(payload[key]));
          } else {
            values.push(payload[key]);
          }
        }
      }
      if (fields.length === 0) return existing;
      values.push(diaryId);
      const query = `UPDATE ai_analysis SET ${fields.join(', ')}, analyzed_at = COALESCE(analyzed_at, NOW()) WHERE diary_id = ?`;
      await db.execute(query, values);
      return AIAnalysis.findByDiaryId(diaryId);
    }

    const analysisId = uuidv4();
    const query = `INSERT INTO ai_analysis (analysis_id, diary_id, emotion_score, dominant_emotion, keywords, summary, suggestion, analyzed_at, model_version, status) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`;
    const vals = [analysisId, diaryId, payload.emotion_score ? (typeof payload.emotion_score === 'string' ? payload.emotion_score : JSON.stringify(payload.emotion_score)) : null, payload.dominant_emotion || null, payload.keywords ? (typeof payload.keywords === 'string' ? payload.keywords : JSON.stringify(payload.keywords)) : null, payload.summary || null, payload.suggestion || null, payload.model_version || null, payload.status || 'completed'];
    await db.execute(query, vals);
    return AIAnalysis.findByDiaryId(diaryId);
  }

  static async markPendingIfMissing(diaryId) {
    const existing = await AIAnalysis.findByDiaryId(diaryId);
    if (!existing) {
      const analysisId = uuidv4();
      await db.execute('INSERT INTO ai_analysis (analysis_id, diary_id, status, analyzed_at) VALUES (?, ?, ?, NOW())', [analysisId, diaryId, 'pending']);
    } else {
      await db.execute('UPDATE ai_analysis SET status = ? WHERE diary_id = ?', ['pending', diaryId]);
    }
  }

  static async markFailed(diaryId) {
    await db.execute('UPDATE ai_analysis SET status = ? WHERE diary_id = ?', ['failed', diaryId]);
  }
}

module.exports = AIAnalysis;
