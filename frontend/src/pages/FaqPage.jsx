import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './FaqPage.css'

function FaqPage() {
  const navigate = useNavigate()
  const faqs = useMemo(
    () => [
      {
        question: '我想要加好友，應該要怎麼加呢？',
        answer: '可以到好友管理中搜尋好友的用戶名稱，用戶名稱可在會員管理中找到。'
      },
      {
        question: '日記李可以新增圖片嗎？',
        answer: '可以新增圖片，但圖片大小限制為5MB，請在上傳時注意一下檔案格式。'
      }
      ,
      {
        question: '圖片檔案是否有限制？',
        answer: '圖片檔案大小上限為 5MB，且僅支援 JPG、PNG 格式。'
      }
    ],
    []
  )

  return (
    <div className="faq-page fade-in">
      <h1 className="faq-title">常見問題</h1>

      <div className="faq-list">
        {faqs.map((item, index) => (
          <article className="faq-card" key={item.question}>
            <p className="faq-question">
              <span className="faq-label">Q{index + 1}：</span>
              {item.question}
            </p>
            <p className="faq-answer">
              <span className="faq-label">A{index + 1}：</span>
              {item.answer}
            </p>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="faq-feedback"
        onClick={() => navigate('/feedback')}
      >
        問題回饋
      </button>
    </div>
  )
}

export default FaqPage