import React, { useState, useEffect } from 'react';
import './LuckyCardPage.css';
import { luckyCardAPI } from '../../services/api';

// 匯入卡牌圖片
import cardFront1 from '../../assets/images/card-front-1.png';
import cardFront2 from '../../assets/images/card-front-2.png';
import cardFront3 from '../../assets/images/card-front-3.png';
import cardFront4 from '../../assets/images/card-front-4.png';

const cards = [
  { id: 1, frontImage: cardFront1, label: '星象卡一' },
  { id: 2, frontImage: cardFront2, label: '星象卡二' },
  { id: 3, frontImage: cardFront3, label: '星象卡三' },
  { id: 4, frontImage: cardFront4, label: '星象卡四' }
];

const LuckyCardPage = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');

  useEffect(() => {
    const loadTodayFortune = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        const response = await luckyCardAPI.getTodayFortune();
        if (response?.hasDrawn && response.fortune) {
          const slot = cards.some((card) => card.id === response.fortune.cardSlot)
            ? response.fortune.cardSlot
            : 1;
          setFortune(response.fortune);
          setSelectedCard(slot);
          setHasDrawn(true);
          setStatusMessage('今日已抽出幸運小卡，記得明天再來喔！');
          setShareFeedback('');
        }
      } catch (error) {
        console.error('Failed to load today fortune:', error);
        setErrorMessage('無法取得今日運勢，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };

    loadTodayFortune();
  }, []);

  const handleCardClick = async (cardId) => {
    if (loading) return;

    if (hasDrawn) {
      const recordedSlot = cards.some((card) => card.id === fortune?.cardSlot)
        ? fortune.cardSlot
        : selectedCard || 1;
      setSelectedCard(recordedSlot);
      setStatusMessage('今日已抽出幸運小卡，記得明天再來喔！');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setStatusMessage('');
      setShareFeedback('');
      const response = await luckyCardAPI.drawCard(cardId);
      const drawnFortune = response?.fortune;

      if (drawnFortune) {
        const slot = cards.some((card) => card.id === drawnFortune.cardSlot)
          ? drawnFortune.cardSlot
          : cardId;
        setSelectedCard(slot);
        setFortune({ ...drawnFortune, cardSlot: slot });
        setHasDrawn(true);
        setStatusMessage('為你揭露今日幸運小卡 ✨');
        setShareFeedback('');
      } else {
        setErrorMessage('抽卡結果異常，請稍後再試。');
      }
    } catch (error) {
      console.error('Draw card failed:', error);
      const backendMessage = error.response?.data?.message || error.response?.data?.error;
      setErrorMessage(backendMessage || '抽卡時發生錯誤，請稍後再試。');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (fortuneData) => {
    if (!fortuneData) return;

    const shareText = `${fortuneData.title}\n${fortuneData.message}`;
    const sharePayload = {
      title: '今日運勢',
      text: shareText
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        setShareFeedback('分享成功，祝朋友也幸運滿滿！');
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShareFeedback('已複製到剪貼簿，快分享給朋友吧！');
      } else {
        setShareFeedback('此裝置暫不支援分享功能，請手動複製內容。');
      }
    } catch (err) {
      console.warn('Share failed:', err);
      setShareFeedback('分享未完成，稍後再試看看。');
    }
  };

  return (
    <div className="lucky-card-container">
      <div className="page-header">
        <h1 className="page-title">今日運勢</h1>
        <p className="page-subtitle">
          快來測測你的運勢，領取你的專屬語錄吧～<br />
          偷偷告訴你♡愛笑的人運氣都不會太差喔～
        </p>
      </div>

      <div className="card-grid">
        {cards.map((card) => {
          const isFlipped = selectedCard === card.id;
          const isDisabled = hasDrawn && !isFlipped;

          return (
            <div
              key={card.id}
              className={`card-scene ${isDisabled ? 'card-disabled' : ''}`}
              onClick={() => handleCardClick(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleCardClick(card.id);
                }
              }}
              aria-label={`選擇第 ${card.id} 張卡片`}
            >
              <div className="card-float">
                <div className={`card-object ${isFlipped ? 'is-flipped' : ''}`}>
                  <div className="card-face card-face-front">
                    <img src={card.frontImage} alt={card.label} />
                  </div>
                  <div className="card-face card-face-back">
                    <div className="card-back-content">
                      {isFlipped && fortune ? (
                        <>
                          <h3 className="card-back-title">{fortune.title}</h3>
                          <p className="card-back-text">{fortune.message}</p>
                        </>
                      ) : (
                        <>
                          <h3 className="card-back-title">等待揭曉</h3>
                          <p className="card-back-text">選擇你的幸運小卡來揭曉今日運勢。</p>
                        </>
                      )}
                    </div>
                    {isFlipped && fortune && (
                      <button
                        type="button"
                        className="card-share-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleShare(fortune);
                        }}
                      >
                        分享
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-status">
        {loading && <p className="status-info">正在為你準備幸運小卡...</p>}
        {!loading && statusMessage && <p className="status-info">{statusMessage}</p>}
        {shareFeedback && <p className="status-info">{shareFeedback}</p>}
        {errorMessage && <p className="status-error">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default LuckyCardPage;
