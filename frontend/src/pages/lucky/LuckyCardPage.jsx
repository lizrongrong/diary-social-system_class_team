import { useState, useEffect } from 'react'
import { Sparkles, Gift, TrendingUp, Star } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import axios from 'axios'

const API_URL = 'http://localhost:3000/api/v1'

function LuckyCardPage() {
  const { user } = useAuthStore()
  const [cards, setCards] = useState([])
  const [drawnCard, setDrawnCard] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [userCards, setUserCards] = useState([])
  const [activeTab, setActiveTab] = useState('draw') // draw | collection

  useEffect(() => {
    loadCards()
    loadUserCards()
  }, [])

  const loadCards = async () => {
    try {
  const token = sessionStorage.getItem('token')
      const response = await axios.get(`${API_URL}/cards`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCards(response.data.cards || [])
    } catch (error) {
      console.error('Load cards error:', error)
    }
  }

  const loadUserCards = async () => {
    try {
  const token = sessionStorage.getItem('token')
      const response = await axios.get(`${API_URL}/cards/my-cards`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUserCards(response.data.cards || [])
    } catch (error) {
      console.error('Load user cards error:', error)
    }
  }

  const handleDraw = async () => {
    setDrawing(true)
    try {
  const token = sessionStorage.getItem('token')
      const response = await axios.post(`${API_URL}/cards/draw`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setDrawnCard(response.data.card)
      
      // 動畫效果
      setTimeout(() => {
        setShowCard(true)
        setDrawing(false)
        loadUserCards() // 重新載入收藏
      }, 1500)
    } catch (error) {
      setDrawing(false)
      alert('抽卡失敗：' + (error.response?.data?.message || error.message))
    }
  }

  const getRarityColor = (rarity) => {
    const colors = {
      common: '#95A5A6',
      rare: '#3498DB',
      epic: '#9B59B6',
      legendary: '#F39C12'
    }
    return colors[rarity] || colors.common
  }

  const getRarityLabel = (rarity) => {
    const labels = {
      common: '普通',
      rare: '稀有',
      epic: '史詩',
      legendary: '傳說'
    }
    return labels[rarity] || '普通'
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #667EEA 0%, #764BA2 100%)',
      padding: 'var(--spacing-xl)',
      paddingTop: '80px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          color: '#FFFFFF',
          marginBottom: 'var(--spacing-2xl)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <Sparkles size={40} />
            <h1 className="text-h1" style={{ margin: 0 }}>幸運抽卡</h1>
          </div>
          <p className="text-body" style={{ opacity: 0.9 }}>
            每天免費抽取一張卡片，獲得特殊祝福與靈感
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-2xl)'
        }}>
          <Button
            variant={activeTab === 'draw' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('draw')}
            style={{ 
              minWidth: 120,
              background: activeTab === 'draw' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'draw' ? 'var(--primary-purple)' : '#FFFFFF',
              border: '2px solid #FFFFFF'
            }}
          >
            <Gift size={18} />
            抽卡
          </Button>
          <Button
            variant={activeTab === 'collection' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('collection')}
            style={{ 
              minWidth: 120,
              background: activeTab === 'collection' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'collection' ? 'var(--primary-purple)' : '#FFFFFF',
              border: '2px solid #FFFFFF'
            }}
          >
            <Star size={18} />
            收藏 ({userCards.length})
          </Button>
        </div>

        {/* Draw Tab */}
        {activeTab === 'draw' && (
          <div style={{ textAlign: 'center' }}>
            {/* Draw Area */}
            <div style={{ 
              position: 'relative',
              marginBottom: 'var(--spacing-2xl)'
            }}>
              {!showCard ? (
                <div 
                  className="hover-lift"
                  style={{
                    width: 280,
                    height: 400,
                    margin: '0 auto',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: drawing ? 'not-allowed' : 'pointer',
                    animation: drawing ? 'pulse 1s infinite' : 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}
                  onClick={!drawing ? handleDraw : null}
                >
                  {drawing ? (
                    <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
                      <Sparkles size={64} className="pulse" style={{ marginBottom: 'var(--spacing-md)' }} />
                      <div className="text-h3">抽卡中...</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
                      <Gift size={64} style={{ marginBottom: 'var(--spacing-md)' }} />
                      <div className="text-h3">點擊抽卡</div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="slide-up"
                  style={{
                    width: 280,
                    height: 400,
                    margin: '0 auto',
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-lg)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    border: `3px solid ${getRarityColor(drawnCard?.rarity)}`
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    <span 
                      className="text-tiny"
                      style={{ 
                        background: getRarityColor(drawnCard?.rarity),
                        color: '#FFFFFF',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 600
                      }}
                    >
                      {getRarityLabel(drawnCard?.rarity)}
                    </span>
                    <Star size={20} fill={getRarityColor(drawnCard?.rarity)} color={getRarityColor(drawnCard?.rarity)} />
                  </div>
                  
                  <div style={{ 
                    fontSize: 80,
                    marginBottom: 'var(--spacing-lg)',
                    marginTop: 'var(--spacing-xl)'
                  }}>
                    {drawnCard?.icon || '🎴'}
                  </div>
                  
                  <h3 className="text-h3" style={{ 
                    marginBottom: 'var(--spacing-sm)',
                    color: 'var(--dark-purple)'
                  }}>
                    {drawnCard?.card_name}
                  </h3>
                  
                  <p className="text-body text-small" style={{ 
                    color: 'var(--gray-600)',
                    marginBottom: 'var(--spacing-lg)'
                  }}>
                    {drawnCard?.description}
                  </p>
                  
                  <div style={{ 
                    background: 'var(--gray-50)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 'auto'
                  }}>
                    <div className="text-tiny" style={{ color: 'var(--gray-500)', marginBottom: 4 }}>
                      特殊效果
                    </div>
                    <div className="text-small" style={{ fontWeight: 500 }}>
                      {drawnCard?.effect_description || '神秘祝福'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showCard && (
              <Button
                variant="primary"
                size="large"
                onClick={() => {
                  setShowCard(false)
                  setDrawnCard(null)
                }}
                style={{
                  background: '#FFFFFF',
                  color: 'var(--primary-purple)'
                }}
              >
                再抽一次
              </Button>
            )}
          </div>
        )}

        {/* Collection Tab */}
        {activeTab === 'collection' && (
          <div>
            {userCards.length === 0 ? (
              <Card style={{ 
                textAlign: 'center', 
                padding: 'var(--spacing-3xl)',
                background: 'rgba(255,255,255,0.95)'
              }}>
                <Star size={64} style={{ color: 'var(--gray-300)', margin: '0 auto var(--spacing-lg)' }} />
                <h3 className="text-h3" style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-sm)' }}>
                  還沒有收藏
                </h3>
                <p className="text-body" style={{ color: 'var(--gray-500)' }}>
                  快去抽卡吧！
                </p>
              </Card>
            ) : (
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 'var(--spacing-lg)'
              }}>
                {userCards.map((item, index) => (
                  <Card 
                    key={item.draw_id}
                    hoverable
                    className="slide-up"
                    style={{ 
                      animationDelay: `${index * 0.05}s`,
                      border: `2px solid ${getRarityColor(item.rarity)}`,
                      background: '#FFFFFF'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--spacing-md)'
                    }}>
                      <span 
                        className="text-tiny"
                        style={{ 
                          background: getRarityColor(item.rarity),
                          color: '#FFFFFF',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        {getRarityLabel(item.rarity)}
                      </span>
                      <Star size={16} fill={getRarityColor(item.rarity)} color={getRarityColor(item.rarity)} />
                    </div>
                    
                    <div style={{ fontSize: 56, marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>
                      {item.icon || '🎴'}
                    </div>
                    
                    <h4 className="text-body" style={{ 
                      fontWeight: 600,
                      marginBottom: 'var(--spacing-xs)',
                      color: 'var(--dark-purple)'
                    }}>
                      {item.card_name}
                    </h4>
                    
                    <p className="text-small" style={{ 
                      color: 'var(--gray-600)',
                      marginBottom: 'var(--spacing-sm)',
                      lineHeight: 1.4
                    }}>
                      {item.description}
                    </p>
                    
                    <div className="text-tiny" style={{ 
                      color: 'var(--gray-400)',
                      marginTop: 'var(--spacing-md)',
                      paddingTop: 'var(--spacing-sm)',
                      borderTop: '1px solid var(--gray-200)'
                    }}>
                      抽取於 {new Date(item.drawn_at).toLocaleDateString('zh-TW')}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LuckyCardPage