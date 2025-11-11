const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const fortunes = require('../data/fortunes');

class Card {
  static getFortunes() {
    return fortunes;
  }

  static getFortuneById(id) {
    return fortunes.find((fortune) => fortune.id === id) || null;
  }

  static getRandomFortune() {
    if (!fortunes.length) {
      throw new Error('FORTUNE_LIST_EMPTY');
    }
    const index = Math.floor(Math.random() * fortunes.length);
    return fortunes[index];
  }

  static async getTodayDraw(userId) {
    const query = `
      SELECT draw_id AS drawId,
            user_id AS userId,
            fortune_id AS fortuneId,
            fortune_title AS title,
            fortune_text AS message,
            card_slot AS cardSlot,
            draw_date AS drawDate, 
            created_at AS createdAt
      FROM user_card_draws
      WHERE user_id = ? AND draw_date = CURDATE()
      LIMIT 1
    `;

    const [rows] = await db.execute(query, [userId]);
    const record = rows[0] || null;

    if (record && record.drawDate instanceof Date) {
      record.drawDate = record.drawDate.toISOString().split('T')[0];
    }

    return record;
  }

  static async recordDraw(userId, fortune, cardSlot = null) {
    const drawId = uuidv4();
    const query = `
      INSERT INTO user_card_draws (
        draw_id,
        user_id,
        fortune_id,
        fortune_title,
        fortune_text,
        card_slot,
        draw_date
      ) VALUES (?, ?, ?, ?, ?, ?, CURDATE())
    `;

    await db.execute(query, [
      drawId,
      userId,
      fortune.id,
      fortune.title,
      fortune.message,
      cardSlot
    ]);

    return {
      drawId,
      userId,
      fortuneId: fortune.id,
      title: fortune.title,
      message: fortune.message,
      cardSlot,
      drawDate: new Date().toISOString().split('T')[0]
    };
  }
}

module.exports = Card;