import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { diaryAPI } from '../../services/api'
import axios from 'axios'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'
import { X, Upload, Image as ImageIcon, Eye, EyeOff } from 'lucide-react'
import {
  EMOTION_COLORS,
  EMOTION_FALLBACK,
  WEATHER_COLORS,
  WEATHER_FALLBACK,
  lightenHexColor
} from '../../utils/tagPalettes'

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
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef(null)

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

  const toggleVisibility = () => {
    setForm(prev => ({
      ...prev,
      visibility: prev.visibility === 'public' ? 'private' : 'public'
    }))
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

  const handleFilesUpload = async (fileList) => {
    if (!Array.isArray(fileList) || fileList.length === 0) return

    const remainingSlots = Math.max(0, 9 - media.length)
    if (remainingSlots === 0) {
      addToast('圖片已達上限 9 張', 'warning')
      return
    }

    const validImages = fileList
      .filter((file) => file.type.startsWith('image/'))
      .filter((file) => {
        if (file.size <= 5 * 1024 * 1024) return true
        addToast(`${file.name} 超過 5MB，已略過`, 'warning')
        return false
      })
      .slice(0, remainingSlots)

    if (validImages.length === 0) {
      addToast('沒有可上傳的圖片', 'warning')
      return
    }

    setUploading(true)
    const formData = new FormData()
    validImages.forEach((file) => formData.append('files', file))

    try {
      const token = sessionStorage.getItem('token')
      const res = await axios.post('http://localhost:3000/api/v1/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      })
      const uploaded = res.data.files.map(f => ({ url: f.url, type: 'image', size: f.size }))
      setMedia(prev => [...prev, ...uploaded])
      addToast(`成功上傳 ${validImages.length} 張圖片`, 'success')
    } catch (err) {
      addToast(err.response?.data?.error || '上傳失敗', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    await handleFilesUpload(files)
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(false)
    if (uploading || saving) return

    const dropped = Array.from(event.dataTransfer?.files || [])
    await handleFilesUpload(dropped)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (uploading || saving) return
    if (!isDragActive) setIsDragActive(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.contains(event.relatedTarget)) return
    setIsDragActive(false)
  }

  const openFileDialog = () => {
    if (uploading || saving || media.length >= 9) return
    fileInputRef.current?.click()
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
            {EMOTIONS.map(emotion => {
              const isActive = tags.emotions.includes(emotion)
              const palette = EMOTION_COLORS[emotion] || EMOTION_FALLBACK
              const borderColor = palette.border || palette.bg || '#CD79D5'
              const activeBackground = lightenHexColor(borderColor, 0.35)
              return (
                <button
                  key={emotion}
                  type="button"
                  onClick={() => toggleEmotion(emotion)}
                  disabled={saving}
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-md)',
                    border: isActive ? `2px solid ${borderColor}` : `1.5px solid ${borderColor}`,
                    borderRadius: 'var(--radius-full)',
                    background: isActive ? palette.border : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : borderColor,
                    cursor: 'pointer',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    transition: 'all var(--transition-base)',
                    boxShadow: isActive ? `0 0 0 4px ${borderColor}22` : 'none'
                  }}
                >
                  {emotion}
                </button>
              )
            })}
          </div>
        </Card>

        {/* 天氣標籤 */}
        <Card>
          <h4 className="text-h4" style={{ marginBottom: 'var(--spacing-sm)' }}>天氣</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            {WEATHERS.map(weather => {
              const isActive = tags.weather === weather
              const palette = WEATHER_COLORS[weather] || WEATHER_FALLBACK
              return (
                <button
                  key={weather}
                  type="button"
                  onClick={() => selectWeather(weather)}
                  disabled={saving}
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-md)',
                    border: isActive ? `2px solid ${palette.border}` : `1.5px solid ${palette.border}`,
                    borderRadius: 'var(--radius-full)',
                    background: isActive ? palette.bg : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : palette.border,
                    cursor: 'pointer',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    transition: 'all var(--transition-base)',
                    boxShadow: isActive ? `0 0 0 4px ${palette.border}22` : 'none'
                  }}
                >
                  {weather}
                </button>
              )
            })}
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
            <div
              role="button"
              tabIndex={uploading || saving || media.length >= 9 ? -1 : 0}
              onClick={openFileDialog}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openFileDialog()
                }
              }}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                padding: 'var(--spacing-lg)',
                border: `2px dashed ${isDragActive ? 'var(--primary-purple)' : 'var(--gray-300)'}`,
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                background: uploading ? 'var(--gray-50)' : isDragActive ? 'rgba(205, 121, 213, 0.08)' : 'transparent',
                transition: 'all var(--transition-base)',
                cursor: uploading || saving || media.length >= 9 ? 'not-allowed' : 'pointer',
                outline: 'none'
              }}
            >
              <Upload size={32} style={{ color: isDragActive ? 'var(--primary-purple)' : 'var(--gray-400)', margin: '0 auto var(--spacing-sm)' }} />
              <p className="text-small" style={{ color: 'var(--gray-600)' }}>
                {uploading ? '上傳中...' : media.length >= 9 ? '已達 9 張上限' : '點擊或拖曳圖片到此處上傳'}
              </p>
            </div>
            <input
              ref={fileInputRef}
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
                      padding: 0,
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
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant={form.visibility === 'public' ? 'primary' : 'outline'}
            onClick={toggleVisibility}
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
          >
            {form.visibility === 'public' ? (
              <>
                <Eye size={18} /> 公開
              </>
            ) : (
              <>
                <EyeOff size={18} /> 私人
              </>
            )}
          </Button>
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
          {/* <Button
            type="button"
            variant="outline"
            onClick={saveDraft}
            disabled={saving}
          >
            儲存草稿
          </Button> */}
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
          >
            {saving ? '儲存中...' : (isEdit ? '更新日記' : '發布日記')}
          </Button>
        </div>
      </form>
    </div >
  )
}

export default DiaryEditor
