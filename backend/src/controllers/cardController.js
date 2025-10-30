const Card = require('../models/Card');

// 獲取所有卡片
exports.getAllCards = async (req, res) => {
  try {
    const cards = await Card.findAll();
    res.json({ cards });
  } catch (error) {
    console.error('Get all cards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 抽卡
exports.drawCard = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // 檢查今天是否已經抽過卡
    const hasDrawn = await Card.hasDrawnToday(userId);
    if (hasDrawn) {
      return res.status(400).json({ 
        message: '今天已經抽過卡了，請明天再來！',
        code: 'ALREADY_DRAWN_TODAY'
      });
    }

    // 隨機抽卡
    const card = await Card.drawRandom();
    
    // 記錄抽卡
    await Card.recordDraw(userId, card.card_id);

    res.json({ 
      message: '抽卡成功！',
      card 
    });
  } catch (error) {
    console.error('Draw card error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 獲取用戶的抽卡記錄
exports.getMyCards = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const cards = await Card.getUserCards(userId, limit, offset);
    const stats = await Card.getUserCardStats(userId);

    res.json({ 
      cards,
      stats
    });
  } catch (error) {
    console.error('Get my cards error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 獲取抽卡統計
exports.getCardStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const stats = await Card.getUserCardStats(userId);
    const hasDrawnToday = await Card.hasDrawnToday(userId);

    res.json({ 
      stats,
      hasDrawnToday
    });
  } catch (error) {
    console.error('Get card stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;