const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');

// 公告是公開的，不需要登入即可讀取
router.get('/active', announcementController.getActive);

module.exports = router;
