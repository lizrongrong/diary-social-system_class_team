import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { userAPI, ensureAbsoluteUrl } from '../../services/api'
import useAuthStore from '../../store/authStore'
import { useToast } from '../../components/ui/Toast'
import './AccountPage.css'

const genderMap = {
    female: '女性',
    male: '男性',
    prefer_not_to_say: '不願透露',
    other: '其他'
}

const statusMap = {
    active: '正常',
    suspended: '停用',
    delete: '刪除',
    deleted: '刪除'
}

const formatDate = (value) => {
    if (!value) return '未設定'

    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date)
    }

    return String(value).replace(/-/g, '/')
}

function ProfilePage() {
    const { addToast } = useToast()
    const { user: authUser, clearAllData } = useAuthStore()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletePending, setDeletePending] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const load = async () => {
            try {
                const data = await userAPI.getProfile()
                setProfile(data?.user || data || null)
            } catch (error) {
                console.error('Failed to load profile', error)
                addToast('載入會員資料失敗，請稍後再試', 'error')
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [addToast])

    const displayName = useMemo(() => {
        if (!profile) return authUser?.username || '會員'
        return profile.display_name || profile.username || authUser?.username || '會員'
    }, [authUser?.username, profile])

    const avatarInitial = (profile?.username || authUser?.username || 'U').charAt(0).toUpperCase()
    const profileImage = useMemo(() => {
        const primary = ensureAbsoluteUrl(profile?.profile_image)
        if (primary) return primary
        return ensureAbsoluteUrl(authUser?.profile_image)
    }, [authUser?.profile_image, profile?.profile_image])
    const email = profile?.email || authUser?.email || '未提供'
    const username = profile?.username || authUser?.username || '未設定'
    const signatureRaw = profile?.signature ?? authUser?.signature
    const signature = signatureRaw && signatureRaw.trim() ? signatureRaw.trim() : '未設定'
    const birthDate = formatDate(profile?.birth_date)
    const genderLabel = genderMap[profile?.gender] || '未設定'
    const statusLabel = statusMap[profile?.status] || '未知'

    const handleDeleteAccountRequest = () => {
        setShowDeleteConfirm(true)
    }

    const handleCloseDeleteConfirm = () => {
        if (deletePending) return
        setShowDeleteConfirm(false)
    }

    const handleConfirmDeleteAccount = async () => {
        if (deletePending) return

        setDeletePending(true)
        try {
            await userAPI.deleteAccount()
            addToast('帳號已刪除，期待下次再見', 'success')
            setShowDeleteConfirm(false)
            clearAllData()
            navigate('/login', { replace: true })
        } catch (error) {
            console.error('Delete account action failed', error)
            if (error.response?.status === 401 || error.response?.status === 403) {
                clearAllData()
                window.location.replace('/login')
                return
            }
            if (error.response?.data?.code === 'ACCOUNT_DELETION_BLOCKED') {
                addToast('系統因相關資料未清除，暫時無法刪除帳號，請聯絡客服', 'warning')
            } else {
                addToast('刪除帳號失敗，請稍後再試', 'error')
            }
        } finally {
            setDeletePending(false)
        }
    }

    if (loading) {
        return (
            <div className="account-page">
                <div className="account-loading">載入中...</div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="account-page">
                <div className="account-error">無法取得會員資料</div>
            </div>
        )
    }

    return (
        <div className="account-page fade-in">
            <header className="account-header">
                <h1 className="account-header-title">會員管理</h1>
            </header>

            <section className="account-card account-profile-card">
                <div className="account-profile-banner">
                    <div className="account-avatar" role="img" aria-label="使用者頭像">
                        {profileImage ? (
                            <img src={profileImage} alt={`${displayName} 的頭像`} />
                        ) : (
                            avatarInitial
                        )}
                    </div>
                    <div className="account-profile-name">{displayName}</div>
                    <button
                        type="button"
                        className="account-edit-btn"
                        onClick={() => navigate('/account/edit-profile')}
                        aria-label="編輯個人資訊"
                    >
                        <PenLine size={16} />
                        <span>編輯個人資訊</span>
                    </button>
                </div>

                <div className="account-info-list">
                    <div className="account-info-row">
                        <span className="account-info-label">使用者帳號</span>
                        <span className="account-info-value">{email}</span>
                    </div>
                    <div className="account-info-row">
                        <span className="account-info-label">用戶名稱</span>
                        <span className="account-info-value">{username}</span>
                    </div>
                    <div className="account-info-row">
                        <span className="account-info-label">個性簽名</span>
                        <span className="account-info-value">{signature}</span>
                    </div>
                    <div className="account-info-row">
                        <span className="account-info-label">真實生日</span>
                        <span className="account-info-value">{birthDate}</span>
                    </div>
                    <div className="account-info-row">
                        <span className="account-info-label">角色性別</span>
                        <span className="account-info-value">{genderLabel}</span>
                    </div>
                </div>
            </section>

            <section className="account-card">
                <h2 className="account-section-title">帳戶資訊</h2>
                <div className="account-info-list account-info-list--dense">
                    <div className="account-info-row">
                        <span className="account-info-label">註冊信箱</span>
                        <span className="account-info-value">{email}</span>
                    </div>
                    <div className="account-info-row">
                        <span className="account-info-label">帳戶狀態</span>
                        <span className={`account-status account-status--${profile?.status || 'unknown'}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <div className="account-info-row account-info-row--action">
                        <span className="account-info-label">刪除帳號</span>
                        <button
                            type="button"
                            className="account-delete-button"
                            onClick={handleDeleteAccountRequest}
                        >
                            刪除帳號
                        </button>
                    </div>
                </div>
            </section>

            {showDeleteConfirm && (
                <div
                    className="account-delete-confirm-backdrop"
                    role="presentation"
                    onClick={handleCloseDeleteConfirm}
                >
                    <div
                        className="account-delete-confirm-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="account-delete-confirm-title"
                        aria-describedby="account-delete-confirm-description"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="account-delete-confirm-title">刪除帳號</h3>
                        <p id="account-delete-confirm-description" className="account-delete-confirm-text">
                            確定要刪除此帳號嗎？此動作無法復原，並且所有資料將永久刪除。
                        </p>
                        <div className="account-delete-confirm-actions">
                            <button
                                type="button"
                                className="account-delete-confirm-btn secondary"
                                onClick={handleCloseDeleteConfirm}
                                disabled={deletePending}
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                className="account-delete-confirm-btn danger"
                                onClick={handleConfirmDeleteAccount}
                                disabled={deletePending}
                            >
                                {deletePending ? '處理中...' : '確認刪除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfilePage
