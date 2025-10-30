// Card Component
export default function Card({ 
  children, 
  className = '',
  style = {},
  hoverable = false,
  onClick 
}) {
  const baseStyles = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #eee',
    padding: '1.5rem',
    transition: 'all 0.2s ease'
  }

  const hoverStyles = hoverable ? {
    cursor: 'pointer'
  } : {}

  return (
    <div
      className={`card ${hoverable ? 'hover-lift' : ''} ${className}`}
      style={{
        ...baseStyles,
        ...hoverStyles,
        ...style
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {children}
    </div>
  )
}
