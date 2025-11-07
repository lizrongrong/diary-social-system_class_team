// Legacy follows controller removed. Keep a defensive handler.
exports.notAvailable = (req, res) => {
  res.status(410).json({ message: 'The follows API is removed. Use /api/v1/followers endpoints.' });
};
