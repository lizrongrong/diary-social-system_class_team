import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { userAPI } from '../../services/api'
import { useToast } from '../../components/ui/Toast'
import './AccountPage.css'

const initialForm = {
    old_password: '',
    new_password: '',
    confirm_password: ''
}

function ChangePasswordPage() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [form, setForm] = useState(initialForm)
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (event) => {
        const { name, value } = event.target
        setForm((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }))
        }
    }

    const validate = () => {
        const nextErrors = {}

        if (!form.old_password.trim()) {
            nextErrors.old_password = '請輸入目前密碼'
        }

        if (!form.new_password.trim()) {
            nextErrors.new_password = '請輸入新密碼'
        } else if (form.new_password.length < 6) {
            nextErrors.new_password = '新密碼至少 6 個字元'
        }

        if (!form.confirm_password.trim()) {
            nextErrors.confirm_password = '請再次輸入新密碼'
        } else if (form.new_password !== form.confirm_password) {
            nextErrors.confirm_password = '兩次輸入的密碼不一致'
        }

        return nextErrors
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        const nextErrors = validate()

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors)
            return
        }

        setSubmitting(true)

        try {
            await userAPI.changePassword({
                old_password: form.old_password,
                new_password: form.new_password
            })
            addToast('密碼已更新', 'success')
            setForm(initialForm)
        } catch (error) {
            const message = error.response?.data?.message || '變更密碼失敗，請確認資訊後重試'
            addToast(message, 'error')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="account-page fade-in">
            <header className="account-header">
                <h1 className="account-header-title">變更密碼</h1>
                <p className="account-header-subtitle">請輸入目前密碼與新密碼以完成更新</p>
            </header>

            <section className="account-card account-password-card">
                <div className="account-password-icon">
                    <KeyRound size={28} />
                </div>

                <form className="account-form" onSubmit={handleSubmit}>
                    <div className="account-form-field">
                        <label htmlFor="old_password">目前密碼 *</label>
                        <input
                            id="old_password"
                            name="old_password"
                            type="password"
                            autoComplete="current-password"
                            value={form.old_password}
                            onChange={handleChange}
                            disabled={submitting}
                            placeholder="請輸入目前密碼"
                        />
                        {errors.old_password && <span className="account-field-error">{errors.old_password}</span>}
                    </div>

                    <div className="account-form-field">
                        <label htmlFor="new_password">新密碼 *</label>
                        <input
                            id="new_password"
                            name="new_password"
                            type="password"
                            autoComplete="new-password"
                            value={form.new_password}
                            onChange={handleChange}
                            disabled={submitting}
                            placeholder="至少 6 個字元"
                        />
                        <span className="account-field-hint">密碼長度至少 6 個字元</span>
                        {errors.new_password && <span className="account-field-error">{errors.new_password}</span>}
                    </div>

                    <div className="account-form-field">
                        <label htmlFor="confirm_password">確認新密碼 *</label>
                        <input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            autoComplete="new-password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            disabled={submitting}
                            placeholder="再次輸入新密碼"
                        />
                        {errors.confirm_password && (
                            <span className="account-field-error">{errors.confirm_password}</span>
                        )}
                    </div>

                    <div className="account-form-actions">
                        <button
                            type="button"
                            className="account-secondary-button"
                            onClick={() => {
                                setForm(initialForm)
                                setErrors({})
                            }}
                            disabled={submitting}
                        >
                            清除
                        </button>
                        <button type="submit" className="account-primary-button" disabled={submitting}>
                            {submitting ? '變更中...' : '變更密碼'}
                        </button>
                    </div>
                </form>

                <button
                    type="button"
                    className="account-link-button"
                    onClick={() => navigate(-1)}
                >
                    返回上一頁
                </button>
            </section>
        </div>
    )
}

export default ChangePasswordPage
