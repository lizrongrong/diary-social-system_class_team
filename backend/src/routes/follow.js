// Legacy follows route has been deprecated. This file remains only as a stub to avoid accidental imports.
// Do not use. Migration target: friends endpoints (/api/v1/friends).
module.exports = (req, res, next) => {
	res.status(410).json({ message: 'The /follows API has been removed. Use /api/v1/friends instead.' });
};

// This router is deprecated; respond 410 for all methods
const express = require('express');
const router = express.Router();
router.all('*', (req, res) => res.status(410).json({ message: 'The /follows API has been removed. Use /api/v1/friends instead.' }));
module.exports = router;
