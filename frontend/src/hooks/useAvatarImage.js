import { useEffect, useMemo, useState } from 'react'
import { ensureAbsoluteUrl } from '../services/api'
import { generateAvatarDataUrl } from '../utils/avatar'

const isDataUrl = (value = '') => value.startsWith('data:')

function useAvatarImage(primary, fallback, seed) {
    const fallbackSeed = seed || ''
    const absolutePrimary = useMemo(() => ensureAbsoluteUrl(primary), [primary])
    const absoluteFallback = useMemo(() => {
        if (fallback) return ensureAbsoluteUrl(fallback)
        if (fallbackSeed) return generateAvatarDataUrl(fallbackSeed)
        return ''
    }, [fallback, fallbackSeed])
    const [resolved, setResolved] = useState(absolutePrimary || absoluteFallback || '')

    useEffect(() => {
        let cancelled = false

        const setSafe = (value) => {
            if (!cancelled) {
                setResolved(value || '')
            }
        }

        if (!absolutePrimary) {
            setSafe(absoluteFallback)
            return () => {
                cancelled = true
            }
        }

        if (isDataUrl(absolutePrimary)) {
            setSafe(absolutePrimary)
            return () => {
                cancelled = true
            }
        }

        if (typeof window === 'undefined' || typeof window.Image === 'undefined') {
            setSafe(absoluteFallback || absolutePrimary)
            return () => {
                cancelled = true
            }
        }

        const img = new window.Image()
        img.onload = () => setSafe(absolutePrimary)
        img.onerror = () => setSafe(absoluteFallback)
        img.src = absolutePrimary

        return () => {
            cancelled = true
            img.onload = null
            img.onerror = null
        }
    }, [absolutePrimary, absoluteFallback])

    return resolved
}

export default useAvatarImage