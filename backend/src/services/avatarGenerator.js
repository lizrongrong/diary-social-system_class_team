const crypto = require('crypto');

const COLOR_PALETTE = [
    '#FF6B6B',
    '#845EC2',
    '#009EFA',
    '#2C73D2',
    '#FF9671',
    '#FFC75F',
    '#008F7A',
    '#D65DB1',
    '#4B4453',
    '#0081CF'
];

const DEFAULT_SIZE = 300;

const pickColor = (seed) => {
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    const value = parseInt(hash.slice(0, 8), 16);
    return COLOR_PALETTE[value % COLOR_PALETTE.length];
};

const buildSvg = (initial, backgroundColor, size = DEFAULT_SIZE) => {
    const safeInitial = initial || 'U';
    const fontSize = Math.round(size * 0.5);
    const radius = size / 2;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="User avatar">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${backgroundColor}" />
    <text x="50%" y="50%" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF">${safeInitial}</text>
</svg>`;
};

const generateAvatar = (username, size = DEFAULT_SIZE) => {
    const base = (username || 'U').trim();
    const initial = base.charAt(0).toUpperCase() || 'U';
    const color = pickColor(base || initial);
    const svg = buildSvg(initial, color, size);
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
};

module.exports = {
    generateAvatar,
    DEFAULT_SIZE
};