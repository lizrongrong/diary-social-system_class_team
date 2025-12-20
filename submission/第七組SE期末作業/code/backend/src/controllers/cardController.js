const Card = require('../models/Card');

exports.getTodayFortune = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const draw = await Card.getTodayDraw(userId);

    if (!draw) {
      return res.json({ hasDrawn: false, fortune: null });
    }

    return res.json({ hasDrawn: true, fortune: draw });
  } catch (error) {
    console.error('Get today fortune error:', error);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.drawCard = async (req, res) => {
  const userId = req.user.user_id;
  const { cardSlot } = req.body || {};

  try {
    const existingDraw = await Card.getTodayDraw(userId);
    if (existingDraw) {
      return res.status(200).json({
        hasDrawn: true,
        fortune: existingDraw,
        message: '今日已抽取幸運小卡'
      });
    }

    const fortune = Card.getRandomFortune();
    const drawRecord = await Card.recordDraw(userId, fortune, cardSlot || null);

    return res.status(201).json({
      hasDrawn: true,
      fortune: drawRecord
    });
  } catch (error) {
    console.error('Draw card error:', error);

    if (error && error.code === 'ER_DUP_ENTRY') {
      const existingDraw = await Card.getTodayDraw(userId);
      return res.status(200).json({
        hasDrawn: true,
        fortune: existingDraw,
        message: '今日已抽取幸運小卡'
      });
    }

    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};