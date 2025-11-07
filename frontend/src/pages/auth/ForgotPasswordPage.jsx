import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../../services/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import './AuthPages.css'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [email, setEmail] = useState('')
  const [step, setStep] = useState(1) // 1=email,2=code,3=new password
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!email) return addToast('請輸入 Email', 'error')
    setLoading(true)
    try {
      await authAPI.sendResetCode(email)
      addToast('已寄出驗證碼（請查看後端 terminal）', 'success')
      setStep(2)
    } catch (err) {
      addToast(err.response?.data?.error || '寄送失敗', 'error')
    } finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (!code) return addToast('請輸入驗證碼', 'error')
    setLoading(true)
    try {
      await authAPI.verifyResetCode(email, code)
      addToast('驗證成功，請輸入新密碼', 'success')
      setStep(3)
    } catch (err) {
      addToast(err.response?.data?.error || '驗證失敗', 'error')
    } finally { setLoading(false) }
  }

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) return addToast('請輸入新密碼並確認', 'error')
    if (newPassword !== confirmPassword) return addToast('兩次密碼不一致', 'error')
    setLoading(true)
    try {
      await authAPI.resetPassword(email, code, newPassword)
      addToast('密碼重設成功，請重新登入', 'success')
      navigate('/login')
    } catch (err) {
      addToast(err.response?.data?.error || '重設失敗', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="register-page">
      <main className="register-main">
        <div className="register-form-container">
          <div className="register-form-header">
            <h2 className="form-title">找回密碼</h2>
            <p className="form-subtitle">請依序完成驗證並重設密碼</p>
          </div>

          <div className="register-form">
            {step === 1 && (
              <>
                <Input label="註冊 Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="請輸入註冊時使用的 Email" />
                <Button variant="primary" size="large" onClick={handleSend} disabled={loading} style={{ width: '100%' }}>{loading ? '寄送中…' : '寄送驗證碼'}</Button>
              </>
            )}

            {step === 2 && (
              <>
                <Input label="驗證碼" name="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="輸入寄到信箱的驗證碼" />
                <Button variant="primary" size="large" onClick={handleVerify} disabled={loading} style={{ width: '100%' }}>{loading ? '驗證中…' : '確認驗證碼'}</Button>
              </>
            )}

            {step === 3 && (
              <>
                <Input label="新密碼" type="password" name="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8-20 字元，包含字母、數字、特殊符號" />
                <Input label="確認新密碼" type="password" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次輸入新密碼" />
                <Button variant="primary" size="large" onClick={handleReset} disabled={loading} style={{ width: '100%' }}>{loading ? '處理中…' : '重設密碼'}</Button>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

export default ForgotPasswordPage
