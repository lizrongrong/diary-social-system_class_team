import React, { useState, useEffect, useRef } from 'react';
import './LuckyCardPage.css';
import html2canvas from 'html2canvas';
import { luckyCardAPI, uploadAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

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

const pad2 = (value) => value.toString().padStart(2, '0');

const formatTimestampForFilename = (date) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  return `${year}${month}${day}_${hour}_${minute}`;
};

const sanitizeFilenameSegment = (value = '') => {
  const safeValue = value
    .toString()
    .trim()
    .replace(/[^0-9a-zA-Z_-]/g, '')
    .slice(0, 64);
  return safeValue || 'user';
};

const LuckyCardPage = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [fortune, setFortune] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [sharePending, setSharePending] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cardCaptureRef = useRef(null);

  const currentUser = useAuthStore((state) => state.user);

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
        setShareLink('');
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

  const handleShare = async () => {
    if (!fortune || sharePending) return;

    const node = cardCaptureRef.current;
    if (!node) {
      setShareFeedback('找不到卡牌內容，請稍後再試。');
      return;
    }

    setSharePending(true);
    setShareFeedback('');
    setShareLink('');
    setIsCapturing(true);

    // 等待下一個渲染幀，確保分享按鈕已從畫面移除再進行截圖
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const canvas = await html2canvas(node, {
        scale: window.devicePixelRatio ? Math.min(window.devicePixelRatio * 1.5, 3) : 2,
        backgroundColor: '#000000',
        logging: false,
        useCORS: true,
        onclone: (documentClone) => {
          const captureEl = documentClone.querySelector('[data-card-capture="true"]');
          if (captureEl) {
            captureEl.style.transform = 'none';
            captureEl.style.backfaceVisibility = 'visible';
          }
        }
      });

      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const userSegment = sanitizeFilenameSegment(
        currentUser?.user_id || currentUser?.username || 'user'
      );
      const timestampSegment = formatTimestampForFilename(new Date());
      const baseFileName = `${userSegment}_${timestampSegment}`;
      const file = new File([blob], `${baseFileName}.png`, { type: 'image/png' });

      const uploaded = await uploadAPI.uploadImage(file, { fileName: baseFileName });
      if (!uploaded?.absoluteUrl) {
        throw new Error('UPLOAD_FAILED');
      }

      const generatedLink = uploaded.absoluteUrl;
      setShareLink(generatedLink);

      let copied = false;

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(generatedLink);
          copied = true;
          setShareFeedback('分享連結已複製，快傳給朋友吧！');
        } catch (clipboardError) {
          console.warn('Clipboard write failed:', clipboardError);
        }
      }

      if (!copied) {
        setShareFeedback('裝置不支援自動複製，請使用下方連結分享。');
      }
    } catch (error) {
      console.error('Generate share link failed:', error);
      setShareFeedback('無法產生分享連結，請稍後再試。');
      setShareLink('');
    } finally {
      setIsCapturing(false);
      setSharePending(false);
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
                  <div
                    className="card-face card-face-back"
                    data-card-capture={isFlipped ? 'true' : 'false'}
                    ref={isFlipped ? cardCaptureRef : null}
                  >
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
                    {isFlipped && fortune && !isCapturing && (
                      <button
                        type="button"
                        className="card-share-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleShare();
                        }}
                        disabled={sharePending}
                      >
                        {sharePending ? '處理中...' : '分享'}
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
        {shareLink && (
          <p className="status-info">
            <a href={shareLink} target="_blank" rel="noopener noreferrer">
              {shareLink}
            </a>
          </p>
        )}
        {errorMessage && <p className="status-error">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default LuckyCardPage;
