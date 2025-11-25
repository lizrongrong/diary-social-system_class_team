const AVATAR_COLORS = ['#FFFFFF']

const hashSeed = (value = '') => {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i)
        hash |= 0
    }
    return Math.abs(hash)
}

const encodeSvg = (svg) => {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
        try {
            return window.btoa(unescape(encodeURIComponent(svg)))
        } catch (error) {
            console.error('Failed to encode SVG avatar', error)
            return ''
        }
    }

    if (typeof Buffer !== 'undefined') {
        return Buffer.from(svg, 'utf-8').toString('base64')
    }

    return ''
}

export const generateAvatarDataUrl = (seed = 'User', initialSeed = '') => {
    const normalizedSeed = seed || initialSeed || 'User'
    const initial = (normalizedSeed.trim().charAt(0) || 'U').toUpperCase()
    const color = AVATAR_COLORS[hashSeed(normalizedSeed) % AVATAR_COLORS.length]
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" role="img" aria-label="User avatar">\n  <rect width="300" height="300" rx="150" fill="${color}" />\n  <text x="50%" y="50%" dy=".1em" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="150" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#CD79D5">${initial}</text>\n</svg>`
    const encoded = encodeSvg(svg)
    return encoded ? `data:image/svg+xml;base64,${encoded}` : ''
}

export default generateAvatarDataUrl