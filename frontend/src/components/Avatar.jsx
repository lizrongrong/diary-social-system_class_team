import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { ensureAbsoluteUrl } from '../services/api'
import { generateAvatarDataUrl } from '../utils/avatar'

const Avatar = ({ src, alt, size, className, seed, style }) => {
    const [imgSrc, setImgSrc] = useState('')
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        if (src) {
            setImgSrc(ensureAbsoluteUrl(src))
            setHasError(false)
        } else {
            setImgSrc('')
            setHasError(true)
        }
    }, [src])

    const handleError = () => {
        setHasError(true)
    }

    const containerStyle = {
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Ensure content stays within border-radius
    }

    if (size) {
        containerStyle.width = size
        containerStyle.height = size
    }

    const renderContent = () => {
        if (hasError || !imgSrc) {
            const fallbackUrl = seed ? generateAvatarDataUrl(seed) : ''
            if (fallbackUrl) {
                return <img src={fallbackUrl} alt={alt || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            }
            return <User size={size ? size * 0.6 : 24} />
        }
        return (
            <img
                src={imgSrc}
                alt={alt || 'Avatar'}
                onError={handleError}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
        )
    }

    return (
        <div className={className} style={containerStyle}>
            {renderContent()}
        </div>
    )
}

export default Avatar