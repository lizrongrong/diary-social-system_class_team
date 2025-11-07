import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { diaryAPI } from '../../services/api'
import axios from 'axios'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'
import { X, Upload, Image as ImageIcon } from 'lucide-react'

// 預設的情緒與天氣選項
const EMOTIONS = ['開心', '難過', '生氣', '焦慮', '平靜', '興奮', '疲累', '感動']
const WEATHERS = ['晴天', '多雲', '陰天', '雨天', '雪天', '起霧']

function DiaryEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { addToast } = useToast()

  const [form, setForm] = useState({
    title: '',
    content: '',
    visibility: 'private',
    status: 'published'
  })
  const [tags, setTags] = useState({ emotions: [], weather: '', keywords: [] })
  const [media, setMedia] = useState([])
  const [keywordInput, setKeywordInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      try {
        const data = await diaryAPI.getById(id)
        const d = data?.diary || data?.item || data
        setForm({
          title: d.title || '',
          content: d.content || '',
          visibility: d.visibility || 'private',
          status: d.status || 'published'
        })
        
        if (d.tags) {
          const emotions = d.tags.filter(t => t.tag_type === 'emotion').map(t => t.tag_value)
          const weather = d.tags.find(t => t.tag_type === 'weather')?.tag_value || ''
          const keywords = d.tags.filter(t => t.tag_type === 'keyword').map(t => t.tag_value)
          setTags({ emotions, weather, keywords })
        }

        if (d.media) {
          setMedia(d.media.map(m => ({ url: m.file_url, type: m.file_type, size: m.file_size })))
        }
      } catch (e) {
        addToast(e.response?.data?.message || '讀取日記失敗', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit, addToast])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const toggleEmotion = (emotion) => {
    setTags(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter(e => e !== emotion)
        : prev.emotions.length < 3 ? [...prev.emotions, emotion] : prev.emotions
    }))
  }

  const selectWeather = (weather) => {
    setTags(prev => ({ ...prev, weather: prev.weather === weather ? '' : weather }))
  }

  const addKeyword = () => {
    if (keywordInput.trim() && tags.keywords.length < 10 && keywordInput.length <= 20) {
      setTags(prev => ({ ...prev, keywords: [...prev.keywords, keywordInput.trim()] }))
      setKeywordInput('')
    }
  }

  const removeKeyword = (idx) => {
    setTags(prev => ({ ...prev, keywords: prev.keywords.filter((_, i) => i !== idx) }))
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length + media.length > 9) {
      addToast('最多只能上傳 9 張圖片', 'warning')
      return
    }

    setUploading(true)
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('http://localhost:3000/api/v1/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      })
      const uploaded = res.data.files.map(f => ({ url: f.url, type: 'image', size: f.size }))
      setMedia(prev => [...prev, ...uploaded])
      addToast(`成功上傳 ${files.length} 張圖片`, 'success')
    } catch (err) {
      addToast(err.response?.data?.error || '上傳失敗', 'error')
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = (idx) => {
    setMedia(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    const allTags = [
      ...tags.emotions.map(e => ({ tag_type: 'emotion', tag_value: e })),
      ...(tags.weather ? [{ tag_type: 'weather', tag_value: tags.weather }] : []),
      ...tags.keywords.map(k => ({ tag_type: 'keyword', tag_value: k }))
    ]
    const payload = { ...form, tags: allTags, media }

    try {
      if (isEdit) {
        await diaryAPI.update(id, payload)
        addToast('日記更新成功', 'success')
      } else {
        await diaryAPI.create(payload)
        addToast('日記建立成功', 'success')
      }
      navigate('/diaries')
    } catch (e) {
      addToast(e.response?.data?.message || '儲存失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveDraft = () => {
    setForm(prev => ({ ...prev, status: 'draft' }))
    setTimeout(() => document.querySelector('form').requestSubmit(), 100)
  }

  if (loading) return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>載入中</div>

  return (
    <div className="page diary-editor fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 900, margin: '0 auto' }}>
      <h2 className="text-h2" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {isEdit ? '編輯日記' : ' 寫新日記'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* 標題 */}
        <Input
          label="標題"
          name="title"
          value={form.title}
          onChange={handleChange}
          error={errors.title}
          required
          placeholder="今天發生了什麼事..."
          disabled={saving}
        />

        {/* 內容 */}
        <div className="input-wrapper">
          <label className="input-label">內容 <span className="required-mark">*</span></label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            required
            rows={12}
            maxLength={10000}
            disabled={saving}
            placeholder="記錄你的想法與感受..."
            className="input-field"
            style={{ 
              fontFamily: 'inherit', 
              resize: 'vertical',
              minHeight: 200
            }}
          />
          <span className="text-tiny" style={{ color: 'var(--gray-500)', marginTop: 'var(--spacing-xs)' }}>
            {form.content.length} / 10,000 字
          </span>
        </div>

        {/* 情緒標籤 */}
        <Card>
          <h4 className="text-h4" style={{ marginBottom: 'var(--spacing-sm)' }}>情緒標籤（最多 3 個）</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            {EMOTIONS.map(emotion => (
              <button
                key={emotion}
                type="button"
                onClick={() => toggleEmotion(emotion)}
                disabled={saving}
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-md)',
                  border: tags.emotions.includes(emotion) ? '2px solid var(--primary-purple)' : '1.5px solid var(--gray-300)',
                  borderRadius: 'var(--radius-full)',
                  background: tags.emotions.includes(emotion) ? 'var(--emotion-pink)' : '#FFFFFF',
                  color: tags.emotions.includes(emotion) ? 'var(--dark-purple)' : 'var(--gray-700)',
                  cursor: 'pointer',
                  fontWeight: tags.emotions.includes(emotion) ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all var(--transition-base)'
                }}
              >
                {emotion}
              </button>
            ))}
          </div>
        </Card>

        {/* 天氣標籤 */}
        <Card>
          <h4 className="text-h4" style={{ marginBottom: 'var(--spacing-sm)' }}>天氣</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            {WEATHERS.map(weather => (
              <button
                key={weather}
                type="button"
                onClick={() => selectWeather(weather)}
                disabled={saving}
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-md)',
                  border: tags.weather === weather ? '2px solid var(--primary-purple)' : '1.5px solid var(--gray-300)',
                  borderRadius: 'var(--radius-full)',
                  background: tags.weather === weather ? 'var(--weather-cyan)' : '#FFFFFF',
                  color: tags.weather === weather ? 'var(--dark-purple)' : 'var(--gray-700)',
                  cursor: 'pointer',
                  fontWeight: tags.weather === weather ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all var(--transition-base)'
                }}
              >
                {weather}
              </button>
            ))}
          </div>
        </Card>

        {/* 關鍵字 */}
        <Card>
          <h4 className="text-h4" style={{ marginBottom: 'var(--spacing-sm)' }}>關鍵字（最多 10 個）</h4>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              maxLength={20}
              placeholder="輸入關鍵字後按 Enter"
              disabled={saving || tags.keywords.length >= 10}
              style={{ flex: 1 }}
            />
            <Button type="button" onClick={addKeyword} variant="secondary" disabled={saving || !keywordInput.trim() || tags.keywords.length >= 10}>
              新增
            </Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
            {tags.keywords.map((kw, idx) => (
              <span key={idx} style={{ 
                padding: 'var(--spacing-xs) var(--spacing-sm)', 
                background: 'var(--gray-100)', 
                borderRadius: 'var(--radius-md)', 
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              }}>
                #{kw}
                <button 
                  type="button" 
                  onClick={() => removeKeyword(idx)} 
                  disabled={saving}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: 'var(--gray-600)',
                    padding: 0,
                    lineHeight: 1
                  }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        </Card>

        {/* 圖片上傳 */}
        <Card>
          <h4 className="text-h4" style={{ marginBottom: 'var(--spacing-sm)' }}>
            圖片附件（最多 9 張，單檔 5MB）
          </h4>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label htmlFor="diary-file-upload" style={{ cursor: media.length >= 9 || uploading ? 'not-allowed' : 'pointer' }}>
              <div style={{
                padding: 'var(--spacing-lg)',
                border: '2px dashed var(--gray-300)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                background: uploading ? 'var(--gray-50)' : 'transparent',
                transition: 'all var(--transition-base)'
              }}>
                <Upload size={32} style={{ color: 'var(--gray-400)', margin: '0 auto var(--spacing-sm)' }} />
                <p className="text-small" style={{ color: 'var(--gray-600)' }}>
                  {uploading ? '上傳中...' : '點擊選擇圖片或拖曳到此處'}
                </p>
              </div>
            </label>
            <input 
              id="diary-file-upload"
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileSelect} 
              disabled={uploading || media.length >= 9 || saving}
              style={{ display: 'none' }}
            />
          </div>

          {media.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--spacing-sm)' }}>
              {media.map((m, idx) => (
                <div key={idx} style={{ 
                  position: 'relative', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden',
                  aspectRatio: '1',
                  border: '1px solid var(--gray-200)'
                }}>
                  <img 
                    src={`http://localhost:3000${m.url}`} 
                    alt={`上傳圖片 ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(idx)}
                    disabled={saving}
                    style={{ 
                      position: 'absolute', 
                      top: 'var(--spacing-xs)', 
                      right: 'var(--spacing-xs)', 
                      background: 'rgba(0,0,0,0.6)', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: 28, 
                      height: 28, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 可見性與狀態 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Select
            label="可見性"
            name="visibility"
            value={form.visibility}
            onChange={handleChange}
            disabled={saving}
            options={[
              { value: 'private', label: ' 私人' },
              { value: 'public', label: ' 公開' }
            ]}
          />
          <Select
            label="狀態"
            name="status"
            value={form.status}
            onChange={handleChange}
            disabled={saving}
            options={[
              { value: 'draft', label: ' 草稿' },
              { value: 'published', label: ' 發布' }
            ]}
          />
        </div>

        {/* 按鈕區 */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--gray-200)' }}>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => navigate('/diaries')}
            disabled={saving}
          >
            取消
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={saveDraft}
            disabled={saving}
          >
            儲存草稿
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={saving}
          >
            {saving ? '儲存中...' : (isEdit ? '更新日記' : '發布日記')}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default DiaryEditor
