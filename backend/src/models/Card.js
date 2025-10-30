const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Card {
  // 獲取所有卡片
  static async findAll() {
    const [rows] = await db.execute(
      'SELECT * FROM cards ORDER BY rarity, card_name'
    );
    return rows;
  }

  // 根據稀有度獲取卡片
  static async findByRarity(rarity) {
    const [rows] = await db.execute(
      'SELECT * FROM cards WHERE rarity = ?',
      [rarity]
    );
    return rows;
  }

  // 隨機抽卡（按稀有度權重）
  static async drawRandom() {
    // 稀有度權重: common: 60%, rare: 25%, epic: 12%, legendary: 3%
    const rand = Math.random() * 100;
    let rarity;
    
    if (rand < 60) rarity = 'common';
    else if (rand < 85) rarity = 'rare';
    else if (rand < 97) rarity = 'epic';
    else rarity = 'legendary';

    const cards = await Card.findByRarity(rarity);
    if (cards.length === 0) {
      // 如果該稀有度沒有卡片，返回 common
      return (await Card.findByRarity('common'))[0];
    }
    
    const randomIndex = Math.floor(Math.random() * cards.length);
    return cards[randomIndex];
  }

  // 記錄用戶抽卡
  static async recordDraw(userId, cardId) {
    const drawId = uuidv4();
    await db.execute(
      'INSERT INTO card_draws (draw_id, user_id, card_id) VALUES (?, ?, ?)',
      [drawId, userId, cardId]
    );
    return drawId;
  }

  // 獲取用戶的抽卡記錄
  static async getUserCards(userId, limit = 50, offset = 0) {
    const [rows] = await db.execute(
      `SELECT cd.draw_id, cd.drawn_at, c.* 
       FROM card_draws cd 
       JOIN cards c ON cd.card_id = c.card_id 
       WHERE cd.user_id = ? 
       ORDER BY cd.drawn_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }

  // 檢查用戶今日是否已抽卡
  static async hasDrawnToday(userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM card_draws 
       WHERE user_id = ? AND DATE(drawn_at) = CURDATE()`,
      [userId]
    );
    return rows[0].count > 0;
  }

  // 獲取用戶收藏統計
  static async getUserCardStats(userId) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(DISTINCT cd.card_id) as unique_cards,
        COUNT(*) as total_draws,
        SUM(CASE WHEN c.rarity = 'legendary' THEN 1 ELSE 0 END) as legendary_count,
        SUM(CASE WHEN c.rarity = 'epic' THEN 1 ELSE 0 END) as epic_count,
        SUM(CASE WHEN c.rarity = 'rare' THEN 1 ELSE 0 END) as rare_count,
        SUM(CASE WHEN c.rarity = 'common' THEN 1 ELSE 0 END) as common_count
       FROM card_draws cd
       JOIN cards c ON cd.card_id = c.card_id
       WHERE cd.user_id = ?`,
      [userId]
    );
    return rows[0];
  }
}

module.exports = Card;