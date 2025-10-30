import { useEffect, useState } from 'react'
import { userAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { User, Lock, Mail, Calendar, Camera } from 'lucide-react'

function ProfilePage() {
  const { user } = useAuthStore()
  const { showToast } = useToast()
  const [profile, setProfile] = useState({ 
    display_name: '', 
    gender: 'prefer_not_to_say',
    birth_date: ''
  })
  const [pwd, setPwd] = useState({ 
    old_password: '', 
    new_password: '', 
    new_password_confirm: '' 
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changing, setChanging] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await userAPI.getProfile()
      setProfile({
        display_name: data?.user?.display_name || '',
        gender: data?.user?.gender || 'prefer_not_to_say',
        birth_date: data?.user?.birth_date || ''
      })
    } catch (e) {
      showToast('載入個人資料失敗', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPwd(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    
    try {
      await userAPI.updateProfile(profile)
      showToast('個人資料已更新', 'success')
    } catch (e) {
      if (e.response?.data?.errors) {
        setErrors(e.response.data.errors)
      }
      showToast(e.response?.data?.message || '更新失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    
    // 前端驗證
    const newErrors = {}
    if (!pwd.old_password) newErrors.old_password = '請輸入目前密碼'
    if (!pwd.new_password) newErrors.new_password = '請輸入新密碼'
    if (pwd.new_password.length < 6) newErrors.new_password = '新密碼至少 6 個字元'
    if (pwd.new_password !== pwd.new_password_confirm) {
      newErrors.new_password_confirm = '兩次密碼不一致'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setChanging(true)
    setErrors({})
    
    try {
      await userAPI.changePassword(pwd)
      showToast('密碼已變更', 'success')
      setPwd({ old_password: '', new_password: '', new_password_confirm: '' })
    } catch (e) {
      if (e.response?.data?.errors) {
        setErrors(e.response.data.errors)
      }
      showToast(e.response?.data?.message || '變更密碼失敗', 'error')
    } finally {
      setChanging(false)
    }
  }

  if (loading) {
    return (
      <div className="page profile-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 800, margin: '0 auto' }}>
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 'var(--radius-lg)' }}></div>
      </div>
    )
  }

  return (
    <div className="page profile-page fade-in" style={{ padding: 'var(--spacing-xl)', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 className="text-h2" style={{ color: 'var(--primary-purple)' }}> 個人檔案設定</h2>
        <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--spacing-sm)' }}>
          管理您的帳戶資訊和偏好設定
        </p>
      </div>

      {/* Profile Card */}
      <Card className="slide-up" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)',
          paddingBottom: 'var(--spacing-lg)',
          borderBottom: '2px solid var(--gray-200)'
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-purple), var(--primary-pink))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '3rem',
              fontWeight: 700,
              border: '4px solid var(--gray-200)'
            }}>
              {(profile.display_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <button
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--primary-purple)',
                border: '2px solid #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#FFFFFF'
              }}
              onClick={() => showToast('頭像上傳功能即將推出', 'info')}
            >
              <Camera size={16} />
            </button>
          </div>
          
          <div>
            <h3 className="text-h3" style={{ marginBottom: 'var(--spacing-xs)' }}>
              {profile.display_name || user?.username || '用戶'}
            </h3>
            <div className="text-small" style={{ color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <Mail size={14} />
              {user?.email || '未設定信箱'}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={saveProfile}>
          <h4 className="text-h4" style={{ 
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--primary-purple)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)'
          }}>
            <User size={20} />
            基本資料
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <Input
              type="text"
              label="顯示名稱"
              name="display_name"
              value={profile.display_name}
              onChange={handleProfileChange}
              error={errors.display_name}
              placeholder="請輸入您的顯示名稱"
              disabled={saving}
            />

            <Select
              label="性別"
              name="gender"
              value={profile.gender}
              onChange={handleProfileChange}
              error={errors.gender}
              disabled={saving}
              options={[
                { value: 'male', label: '男性' },
                { value: 'female', label: '女性' },
                { value: 'other', label: '其他' },
                { value: 'prefer_not_to_say', label: '不願透露' }
              ]}
            />

            <Input
              type="date"
              label="生日"
              name="birth_date"
              value={profile.birth_date}
              onChange={handleProfileChange}
              error={errors.birth_date}
              disabled={saving}
              helperText="選填，用於生日提醒"
            />
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? '儲存中...' : '儲存變更'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Card */}
      <Card className="slide-up" style={{ animationDelay: '0.1s' }}>
        <form onSubmit={changePassword}>
          <h4 className="text-h4" style={{ 
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--primary-purple)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)'
          }}>
            <Lock size={20} />
            變更密碼
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <Input
              type="password"
              label="目前密碼"
              name="old_password"
              value={pwd.old_password}
              onChange={handlePasswordChange}
              error={errors.old_password}
              placeholder="請輸入目前密碼"
              disabled={changing}
              required
            />

            <Input
              type="password"
              label="新密碼"
              name="new_password"
              value={pwd.new_password}
              onChange={handlePasswordChange}
              error={errors.new_password}
              placeholder="至少 6 個字元"
              disabled={changing}
              required
              helperText="密碼長度至少 6 個字元"
            />

            <Input
              type="password"
              label="確認新密碼"
              name="new_password_confirm"
              value={pwd.new_password_confirm}
              onChange={handlePasswordChange}
              error={errors.new_password_confirm}
              placeholder="再次輸入新密碼"
              disabled={changing}
              required
            />
          </div>

          <div style={{ 
            marginTop: 'var(--spacing-xl)', 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: 'var(--spacing-md)'
          }}>
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => setPwd({ old_password: '', new_password: '', new_password_confirm: '' })}
              disabled={changing}
            >
              清除
            </Button>
            <Button type="submit" variant="primary" disabled={changing}>
              {changing ? '變更中...' : '變更密碼'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Account Info Card */}
      <Card className="slide-up" style={{ marginTop: 'var(--spacing-lg)', animationDelay: '0.2s' }}>
        <h4 className="text-h4" style={{ 
          marginBottom: 'var(--spacing-md)',
          color: 'var(--primary-purple)'
        }}>
          帳戶資訊
        </h4>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'var(--spacing-sm)',
          color: 'var(--gray-600)',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>用戶名稱</span>
            <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{user?.username}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>註冊信箱</span>
            <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{user?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>帳戶狀態</span>
            <span style={{ 
              padding: '2px 8px',
              background: '#E8F5E9',
              color: '#2E7D32',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              正常
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ProfilePage
