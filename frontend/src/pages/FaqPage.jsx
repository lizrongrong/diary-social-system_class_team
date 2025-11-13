import { useMemo } from 'react'
import './FaqPage.css'

function FaqPage() {
  const faqs = useMemo(
    () => [
      {
        question: '我想要加好友，應該要怎麼加呢？',
        answer: '可以到好友管理中搜尋好友的 ID，帳號 ID 在會員管理中可以找到。'
      },
      {
        question: '新增日記是否有上限？',
        answer: '有的，會員一篇日記字數上限 800 字。'
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
        onClick={() => window.dispatchEvent(new CustomEvent('faqFeedbackClick'))}
      >
        問題回饋 &gt;&gt;
      </button>
    </div>
  )
}

export default FaqPage