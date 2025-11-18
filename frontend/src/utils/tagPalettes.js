export const EMOTION_COLORS = {
  '開心': { bg: '#FFBF00', border: '#FFBF00' },
  '難過': { bg: '#3C7AFF', border: '#3C7AFF' },
  '生氣': { bg: '#FF7474', border: '#FF7474' },
  '焦慮': { bg: '#C58C58', border: '#C58C58' },
  '平靜': { bg: '#00C151', border: '#00C151' },
  '興奮': { bg: '#FF77E4', border: '#FF77E4' },
  '疲累': { bg: '#C426FD', border: '#C426FD' },
  '感動': { bg: '#41AAFA', border: '#41AAFA' }
}

export const EMOTION_FALLBACK = {
  bg: 'var(--emotion-pink)',
  border: 'var(--primary-purple)',
  text: 'var(--dark-purple)'
}

export const WEATHER_COLORS = {
  '晴天': { bg: '#FFD54F', border: '#8C6D00' },
  '多雲': { bg: '#6d88aeff', border: '#2f415bff' },
  '陰天': { bg: '#9CA3AF', border: '#374151' },
  '雨天': { bg: '#60A5FA', border: '#1D4ED8' },
  '雪天': { bg: '#677af9ff', border: '#0E7490' },
  '起霧': { bg: '#9786dcff', border: '#5B21B6' }
}

export const WEATHER_FALLBACK = {
  bg: '#B2EBF2',
  border: '#38BDF8',
  text: '#0E7490'
}

export const lightenHexColor = (hex, amount = 0.35) => {
  if (!hex || typeof hex !== 'string') return hex
  if (hex.startsWith('var(')) return hex

  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex

  const clamp = (value) => Math.max(0, Math.min(255, value))
  const channels = [0, 2, 4]
    .map(offset => parseInt(normalized.slice(offset, offset + 2), 16))

  if (channels.some(Number.isNaN)) return hex

  const lightened = channels
    .map(channel => clamp(Math.round(channel + (255 - channel) * amount)))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')

  return `#${lightened}`
}

export const getEmotionPalette = (value) => {
  if (!value) return EMOTION_FALLBACK
  return EMOTION_COLORS[value] || EMOTION_FALLBACK
}

export const getWeatherPalette = (value) => {
  if (!value) return WEATHER_FALLBACK
  return WEATHER_COLORS[value] || WEATHER_FALLBACK
}

export const buildTagStyle = (palette) => {
  const resolved = palette || {}
  const baseColor = resolved.border || resolved.bg || 'var(--primary-purple)'
  const background = resolved.bg || lightenHexColor(baseColor, 1.0)
  const borderColor = resolved.border || baseColor
  const textColor = resolved.border || borderColor

  return {
    background,
    border: `1.5px solid ${borderColor}`,
    color: textColor,
    fontWeight: 600
  }
}