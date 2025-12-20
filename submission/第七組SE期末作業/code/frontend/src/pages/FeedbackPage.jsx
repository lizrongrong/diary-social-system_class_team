import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { feedbackAPI } from '../services/api'
import { useToast } from '../components/ui/Toast'
import './FeedbackPage.css'

const DEFAULT_CATEGORY = 'general'

function FeedbackPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categories = useMemo(
    () => [
      { value: 'general', label: '一般問題' },
      { value: 'feature', label: '功能問題' },
      { value: 'account', label: '帳戶問題' },
      { value: 'diary', label: '日記相關問題' },
      { value: 'followers', label: '好友管理問題' },
      { value: 'card', label: '卡牌抽取問題' },
      { value: 'analysis', label: '回顧分析問題' },
      { value: 'other', label: '其他問題' }
    ],
    []
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!subject.trim() || !description.trim()) {
      addToast('請完整填寫問題主旨與詳細描述', 'warning')
      return
    }

    setSubmitting(true)
    try {
      await feedbackAPI.submit({
        subject: subject.trim(),
        category,
        description: description.trim()
      })
      addToast('感謝您的回饋，我們將盡快處理', 'success')
      navigate('/faq')
    } catch (error) {
      console.error('Submit feedback failed:', error)
      const message = error.response?.data?.message || error.response?.data?.error || '送出回饋失敗，請稍後再試'
      addToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="feedback-page fade-in">
      <header className="feedback-header">
        <h1>問題回饋</h1>
        <p>請告訴我們您遇到的問題或想法，我們會盡快回覆您。</p>
      </header>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="feedback-field">
          <label htmlFor="feedback-subject">問題主旨</label>
          <input
            id="feedback-subject"
            name="subject"
            type="text"
            placeholder="請輸入問題主旨"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={submitting}
            maxLength={100}
            required
          />
        </div>

        <div className="feedback-field">
          <label htmlFor="feedback-category">問題類別</label>
          <div className="feedback-select-wrapper">
            <select
              id="feedback-category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={submitting}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="feedback-field">
          <label htmlFor="feedback-description">詳細描述</label>
          <textarea
            id="feedback-description"
            name="description"
            placeholder="請描述您遇到的問題或希望我們優化的地方"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={submitting}
            rows={6}
            required
          />
        </div>

        <div className="feedback-actions">
          <button type="submit" className="feedback-submit" disabled={submitting}>
            {submitting ? '送出中…' : '送出'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FeedbackPage