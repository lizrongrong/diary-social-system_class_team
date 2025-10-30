import { useNavigate } from 'react-router-dom'
import { X, Lock } from 'lucide-react'
import Button from './Button'

export default function GuestModal({ isOpen, onClose, message }) {
  const navigate = useNavigate()

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '2rem',
          maxWidth: 440,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.3s ease',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            color: '#999',
            display: 'flex'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#FFF3F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}
          >
            <Lock size={32} color="#CD79D5" />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            請先登入
          </h3>
          <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>
            {message || '此功能需要登入後才能使用，立即登入以查看更多內容'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant="outline"
            style={{ flex: 1 }}
            onClick={() => navigate('/register')}
          >
            註冊帳號
          </Button>
          <Button
            variant="primary"
            style={{ flex: 1 }}
            onClick={() => navigate('/login')}
          >
            立即登入
          </Button>
        </div>
      </div>
    </div>
  )
}
