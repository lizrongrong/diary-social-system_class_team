import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, PenLine, X } from 'lucide-react'
import { userAPI, uploadAPI, ensureAbsoluteUrl } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { useToast } from '../../components/ui/Toast'
import './AccountPage.css'

const USERNAME_RULE = /^[a-zA-Z0-9_]{3,10}$/

function EditProfilePage() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { user: authUser, fetchUser } = useAuthStore()
    const fileInputRef = useRef(null)

    const [initialProfile, setInitialProfile] = useState(null)
    const [form, setForm] = useState({ username: '', profile_image: '' })
    const [avatarPreview, setAvatarPreview] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const data = await userAPI.getProfile()
                const user = data?.user || data || null

                if (!user) {
                    addToast('無法載入個人資料', 'error')
                    return
                }

                setInitialProfile(user)
                setForm({
                    username: user.username || '',
                    profile_image: user.profile_image || ''
                })
                setAvatarPreview(ensureAbsoluteUrl(user.profile_image || ''))
            } catch (error) {
                console.error('Failed to load profile for editing', error)
                addToast('載入個人資料失敗，請稍後再試', 'error')
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [addToast])

    const avatarInitial = useMemo(() => {
        const source = form.username || authUser?.username || authUser?.email || 'U'
        return source.charAt(0).toUpperCase()
    }, [authUser?.email, authUser?.username, form.username])

    const handleUsernameChange = (event) => {
        const value = event.target.value
        setForm((prev) => ({ ...prev, username: value }))
        if (errors.username) {
            setErrors((prev) => ({ ...prev, username: '' }))
        }
    }

    const handleClearUsername = () => {
        setForm((prev) => ({ ...prev, username: '' }))
        setErrors((prev) => ({ ...prev, username: '' }))
    }

    const handleAvatarClick = () => {
        if (uploading || saving) return
        const input = fileInputRef.current
        if (!input) return

        if (typeof input.showPicker === 'function') {
            input.showPicker()
        } else {
            input.click()
        }
    }

    const handleAvatarSelect = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''

        if (!file) {
            return
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) {
            addToast('僅支援 JPG、PNG、SVG 圖片', 'warning')
            return
        }

        if (file.size > 9 * 1024 * 1024) {
            addToast('圖片大小不可超過 9MB', 'warning')
            return
        }

        setUploading(true)

        try {
            const uploaded = await uploadAPI.uploadAvatar(file)

            if (!uploaded?.url) {
                throw new Error('UPLOAD_FAILED')
            }

            const previewUrl = ensureAbsoluteUrl(uploaded?.absoluteUrl || uploaded.url)
            setForm((prev) => ({ ...prev, profile_image: uploaded.url }))
            setAvatarPreview(previewUrl)
            addToast('頭貼已更新，請記得儲存', 'success')
        } catch (error) {
            console.error('Avatar upload failed', error)
            const message = error.response?.data?.error || '上傳失敗，請稍後再試'
            addToast(message, 'error')
        } finally {
            setUploading(false)
        }
    }

    const validate = () => {
        const nextErrors = {}
        const trimmed = form.username.trim()

        if (!trimmed) {
            nextErrors.username = '請輸入使用者名稱'
        } else if (!USERNAME_RULE.test(trimmed)) {
            nextErrors.username = '使用者名稱需為 3-10 字元，僅限英文、數字與底線'
        }

        return { nextErrors, trimmed }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        const { nextErrors, trimmed } = validate()

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors)
            return
        }

        const payload = {}
        const baseline = initialProfile || {}

        if (trimmed !== (baseline.username || '').trim()) {
            payload.username = trimmed
        }

        const baselineAvatar = baseline.profile_image || ''
        if (form.profile_image !== baselineAvatar) {
            payload.profile_image = form.profile_image || ''
        }

        if (Object.keys(payload).length === 0) {
            addToast('沒有偵測到需要更新的項目', 'info')
            return
        }

        setSaving(true)

        try {
            await userAPI.updateProfile(payload)
            await fetchUser()
            setErrors({})
            addToast('個人資訊已更新', 'success')
            navigate('/account/profile')
        } catch (error) {
            console.error('Failed to update profile', error)
            const details = error.response?.data?.details

            if (details?.username) {
                setErrors((prev) => ({ ...prev, username: details.username }))
            } else if (error.response?.data?.code === 'USERNAME_EXISTS') {
                setErrors((prev) => ({ ...prev, username: error.response.data.message || '使用者名稱已被使用' }))
            }

            const message = error.response?.data?.message || '更新失敗，請稍後再試'
            addToast(message, 'error')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="account-page">
                <div className="account-loading">載入中...</div>
            </div>
        )
    }

    return (
        <div className="account-page fade-in">
            <header className="account-edit-header">
                <h1 className="account-header-title">修改個人資訊</h1>
            </header>

            <section className="account-card account-edit-profile-card">
                <div className="account-edit-avatar-section">
                    <div className="account-edit-avatar-wrapper">
                        <div className="account-edit-avatar" role="img" aria-label="使用者頭像">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="目前頭像預覽" />
                            ) : (
                                <span>{avatarInitial}</span>
                            )}

                            {uploading && (
                                <div className="account-edit-avatar-overlay" aria-label="頭像上傳中">
                                    <Loader2 size={24} className="account-spinner" />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="account-edit-avatar-button"
                            onClick={handleAvatarClick}
                            aria-label="選擇新的大頭貼"
                            disabled={uploading || saving}
                        >
                            <PenLine size={16} />
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.svg"
                        className="account-hidden-input"
                        onChange={handleAvatarSelect}
                        aria-hidden="true"
                        tabIndex={-1}
                    />
                    <p className="account-edit-avatar-hint">支援 .jpg、.jpeg、.png、.svg，大小需小於 9MB</p>
                </div>

                <form className="account-edit-form" onSubmit={handleSubmit}>
                    <div className={`account-edit-row${errors.username ? ' has-error' : ''}`}>
                        <label htmlFor="username">使用者名稱</label>
                        <div className="account-edit-row-input">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                style={{ fontSize: '20px' }}
                                value={form.username}
                                onChange={handleUsernameChange}
                                placeholder="請輸入使用者名稱"
                                maxLength={10}
                                disabled={saving}
                                autoComplete="username"
                            />
                            {form.username && (
                                <button
                                    type="button"
                                    className="account-edit-clear-btn"
                                    onClick={handleClearUsername}
                                    aria-label="清除使用者名稱"
                                    disabled={saving}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    {errors.username && <span className="account-field-error">{errors.username}</span>}

                    <div className="account-edit-actions">
                        <button
                            type="submit"
                            className="account-primary-button account-edit-submit"
                            disabled={saving || uploading}
                        >
                            {saving ? '修改中...' : '修改'}
                        </button>
                    </div>
                </form>
            </section>

            <div className="account-return-link">
                <button
                    type="button"
                    className="account-link-button"
                    onClick={() => navigate(-1)}
                    disabled={saving || uploading}
                >
                    返回上一頁
                </button>
            </div>
        </div>
    )
}

export default EditProfilePage