import { useEffect, useMemo, useState } from 'react'
import { PenLine } from 'lucide-react'
import { userAPI } from '../../services/api'
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
    const { user: authUser } = useAuthStore()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

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
    const email = profile?.email || authUser?.email || '未提供'
    const username = profile?.username || authUser?.username || '未設定'
    const birthDate = formatDate(profile?.birth_date)
    const genderLabel = genderMap[profile?.gender] || '未設定'
    const statusLabel = statusMap[profile?.status] || '未知'

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
                    <div className="account-avatar">{avatarInitial}</div>
                    <div className="account-profile-name">{displayName}</div>
                    <button
                        type="button"
                        className="account-edit-btn"
                        onClick={() => addToast('暱稱編輯功能即將推出', 'info')}
                        aria-label="編輯暱稱"
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
                            onClick={() => addToast('刪除帳號功能即將推出', 'warning')}
                        >
                            刪除帳號
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default ProfilePage
