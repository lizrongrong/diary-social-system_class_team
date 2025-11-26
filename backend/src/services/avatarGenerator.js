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

const buildSvg = (initial, backgroundColor = '#FFFFFF', size = DEFAULT_SIZE, textColor = '#CD79D5') => {
    const safeInitial = initial || 'U';
    const fontSize = Math.round(size * 0.5);
    const radius = size / 2;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="User avatar">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${backgroundColor}" />
    <text x="50%" y="50%" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="${textColor}">${safeInitial}</text>
</svg>`;
};

const generateAvatar = (username, size = DEFAULT_SIZE) => {
    const base = (username || 'U').trim();
    const initial = base.charAt(0).toUpperCase() || 'U';
    // Default: white background, header purple text
    const textColor = '#CD79D5';
    const svg = buildSvg(initial, '#FFFFFF', size, textColor);
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
};

// Generate an SVG avatar file and return the public uploads URL path.
// Returns a string like "/uploads/avatars/<uuid>.svg"
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const generateAvatarFile = (username, size = DEFAULT_SIZE) => {
    const base = (username || 'U').trim();
    const initial = base.charAt(0).toUpperCase() || 'U';
    // Default file avatar: white background, header purple text
    const textColor = '#CD79D5';
    const svg = buildSvg(initial, '#FFFFFF', size, textColor);

    const projectRoot = path.join(__dirname, '..', '..');
    const uploadsDir = path.join(projectRoot, 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${uuidv4()}.svg`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, svg, 'utf8');

    // Return path served by express static middleware
    return `/uploads/avatars/${filename}`;
};

module.exports = {
    generateAvatar,
    generateAvatarFile,
    DEFAULT_SIZE
};