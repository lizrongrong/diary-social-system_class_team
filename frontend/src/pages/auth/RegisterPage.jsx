import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import './AuthPages.css';
import './RegisterPage.css';

function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    user_id: '',
    email: '',
    password: '',
    password_confirm: '',
    username: '',
    gender: '',
    birth_date: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [checkingUserId, setCheckingUserId] = useState(false);
  const [userIdAvailable, setUserIdAvailable] = useState(null); // null=unknown, true/false
  const [userIdCheckError, setUserIdCheckError] = useState(null);
  // email 即時檢查
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(null); // null=unknown, true/false
  const [emailCheckError, setEmailCheckError] = useState(null);
  // email verification
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // kept for backwards compat but not shown to users
  const [sentVerification, setSentVerification] = useState(false);
  const RIGHT_COL_WIDTH = 120;

  // 密碼強度計算
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*#?&]/.test(password)) strength++;
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // 當使用者在填寫短 user_id 時，若 username 尚未設定或與之前的 user_id 相同，預設同步 username
      if (name === 'user_id') {
        const prevUserId = prev.user_id || '';
        const shouldSyncUsername = !prev.username || prev.username === prevUserId;
        if (shouldSyncUsername) {
          next.username = value;
        }
      }
      return next;
    });
    // 即時密碼強度檢查
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // 清除該欄位的錯誤
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Email 驗證
    if (!formData.email) {
      newErrors.email = '請輸入 Email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '請輸入有效的 Email';
    }

    // 密碼驗證
    if (!formData.password) {
      newErrors.password = '請輸入密碼';
    } else if (formData.password.length < 8 || formData.password.length > 20) {
      newErrors.password = '密碼需 8-20 字元';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/.test(formData.password)) {
      newErrors.password = '密碼需包含字母、數字與特殊符號';
    }

    // 確認密碼
    if (!formData.password_confirm) {
      newErrors.password_confirm = '請確認密碼';
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = '兩次密碼輸入不一致';
    }

    // Username 驗證
    // user_id (short id) 驗證 — 前端可填寫短 ID，儲存在 users.user_id
    if (!formData.user_id) {
      newErrors.user_id = '請輸入使用者識別 ID';
    } else if (!/^[a-zA-Z0-9_]{3,10}$/.test(formData.user_id)) {
      newErrors.user_id = '使用者識別 ID 需 3-10 字元 (英數字與底線)';
    }

    // Username 驗證 (顯示名稱或登入名稱，可較長)
    if (!formData.username) {
      newErrors.username = '請輸入使用者名稱';
    } else if (!/^[\w\-\s]{3,50}$/.test(formData.username)) {
      newErrors.username = '使用者名稱需 3-50 字元';
    }

    // (display_name 已移除，使用 username 作為顯示名稱)

    // Gender 驗證
    if (!formData.gender) {
      newErrors.gender = '請選擇性別';
    }

    // Birth Date 驗證
    if (!formData.birth_date) {
      newErrors.birth_date = '請選擇生日';
    } else {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 13) {
        newErrors.birth_date = '您必須年滿 13 歲才能註冊';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      addToast('請檢查表單內容', 'error');
      return;
    }

    // 若即時檢查已得知不可用，阻止送出
    if (userIdAvailable === false) {
      setErrors(prev => ({ ...prev, user_id: '此 ID 已被使用' }));
      addToast('請檢查使用者識別 ID', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // require email verification before allowing registration
      if (!emailVerified) {
        setErrors(prev => ({ ...prev, email: '請先驗證 Email' }));
        addToast('請先完成 Email 驗證', 'error');
        setIsLoading(false);
        return;
      }
      const { password_confirm, ...registerData } = formData;
      await register(registerData);
      addToast('註冊成功！歡迎加入 Resonote', 'success');
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.data?.details) {
        setErrors(error.response.data.details);
      } else if (error.response?.data?.code === 'EMAIL_EXISTS') {
        setErrors({ email: '此 Email 已被註冊' });
        addToast('此 Email 已被註冊', 'error');
      } else if (error.response?.data?.code === 'USERNAME_EXISTS') {
        setErrors({ username: '此使用者 ID 已被使用' });
        addToast('此使用者 ID 已被使用', 'error');
      } else {
        const errorMsg = error.response?.data?.message || '註冊失敗，請稍後再試';
        setErrors({ general: errorMsg });
        addToast(errorMsg, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    // validate email format first
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors(prev => ({ ...prev, email: '請輸入有效的 Email' }));
      addToast('請輸入有效的 Email', 'error');
      return;
    }
    // 若已知此 email 已被註冊，阻止寄驗證碼（前端快速檢查）
    if (emailExists === true) {
      setErrors(prev => ({ ...prev, email: '此 Email 已被註冊' }));
      addToast('此 Email 已被註冊，請改用忘記密碼或更換 Email', 'error');
      return;
    }
    setSendingCode(true);
    try {
      await authAPI.sendVerification(formData.email);
      setSentVerification(true);
      addToast('驗證碼已寄出，請到信箱查看', 'success');
    } catch (err) {
      console.error('Send verification error', err);
      // 若後端回傳 EMAIL_EXISTS（race condition），給予友善提示
      if (err.response?.data?.code === 'EMAIL_EXISTS') {
        setErrors(prev => ({ ...prev, email: '此 Email 已被註冊' }));
        addToast('此 Email 已被註冊，請改用忘記密碼或更換 Email', 'error');
      } else {
        const msg = err.response?.data?.message || err.response?.data?.error || '寄送驗證碼失敗';
        addToast(msg, 'error');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      addToast('請輸入驗證碼', 'error');
      return;
    }
    setVerifyingCode(true);
    try {
      await authAPI.verifyEmailCode(formData.email, verificationCode);
      setEmailVerified(true);
      addToast('Email 驗證成功', 'success');
    } catch (err) {
      console.error('Verify code error', err);
      addToast(err.response?.data?.message || '驗證失敗或已過期', 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  // 即時檢查 user_id 可用性（debounce）
  useEffect(() => {
    let mounted = true;
    if (!formData.user_id) {
      setUserIdAvailable(null);
      setUserIdCheckError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUserId(true);
      setUserIdCheckError(null);
      try {
        const res = await authAPI.checkUserId(formData.user_id);
        if (!mounted) return;
        setUserIdAvailable(!!res.available);
        // 若不可用，設定 field error 提醒
        setErrors(prev => ({ ...prev, user_id: res.available ? '' : '此 ID 已被使用' }));
      } catch (err) {
        if (!mounted) return;
        setUserIdCheckError('檢查失敗，請稍後再試');
      } finally {
        if (mounted) setCheckingUserId(false);
      }
    }, 500);

    return () => { mounted = false; clearTimeout(timer); };
  }, [formData.user_id]);

  // 即時檢查 email 是否已被註冊（debounce）
  useEffect(() => {
    let mounted = true;
    if (!formData.email) {
      setEmailExists(null);
      setEmailCheckError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setEmailChecking(true);
      setEmailCheckError(null);
      try {
        const res = await authAPI.checkEmail(formData.email);
        if (!mounted) return;
        setEmailExists(!!res.exists);
        // 若已存在，顯示 field error
        setErrors(prev => ({ ...prev, email: res.exists ? '此 Email 已被註冊' : '' }));
      } catch (err) {
        if (!mounted) return;
        setEmailCheckError('檢查失敗，請稍後再試');
      } finally {
        if (mounted) setEmailChecking(false);
      }
    }, 500);

    return () => { mounted = false; clearTimeout(timer); };
  }, [formData.email]);

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0: return '';
      case 1: return '弱';
      case 2: return '中';
      case 3: return '強';
      case 4: return '非常強';
      default: return '';
    }
  };

  const getPasswordStrengthClass = () => {
    switch (passwordStrength) {
      case 1: return 'weak';
      case 2: return 'medium';
      case 3: return 'strong';
      case 4: return 'very-strong';
      default: return '';
    }
  };

  return (
    <div className="register-page">
      {/* Header */}
      {/* <div className="register-header">
        <h1 className="register-logo">Resonote</h1>
      </div> */}

      {/* Main Content */}
      <div className="register-main">
        <div className="register-form-container">
          <div className="register-form-header">
            <h2 className="form-title">註冊</h2>
            <p className="form-subtitle">加入 Resonote 開始記錄</p>
          </div>

          {errors.general && (
            <div className="error-banner">
              <span>⚠️</span>
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            {/* Username (顯示名稱) */}
            {/* Short user_id (由使用者填寫，儲存在 users.user_id) */}
            <Input
              type="text"
              label="使用者識別 ID（短 ID）"
              name="user_id"
              placeholder="請輸入短 ID (3-10 字，英數字與底線)"
              value={formData.user_id}
              onChange={handleChange}
              error={errors.user_id}
              required
              disabled={isLoading}
              helperText="短 ID 將作為系統內的唯一識別，不可重複"
              autoComplete="username"
            />
            <div className="user-id-status">
              {checkingUserId && <small>檢查中…</small>}
              {userIdAvailable === true && <small style={{ color: 'green' }}>✓ 可用</small>}
              {userIdAvailable === false && <small style={{ color: 'red' }}>✕ 已被使用</small>}
              {userIdCheckError && <small style={{ color: 'red' }}>{userIdCheckError}</small>}
            </div>

            <Input
              type="text"
              label="登入帳號 / 個人頁面名稱（可修改）"
              name="username"
              placeholder="請輸入使用者 ID (3-50 字，英數字與底線)"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              required
              disabled={isLoading}
              helperText="用於登入與個人頁面網址；可與使用者識別 ID 不同"
              autoComplete="nickname"
            />

            {/* Email */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Input
                  type="email"
                  label="帳號 (Email)"
                  name="email"
                  placeholder="example@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />

                <div className="email-status" style={{ marginTop: 6 }}>
                  {emailChecking && <small>檢查中…</small>}
                  {emailExists === true && <small style={{ color: 'red' }}>✕ 此 Email 已被註冊</small>}
                  {emailExists === false && <small style={{ color: 'green' }}>✓ 可以使用</small>}
                  {emailCheckError && <small style={{ color: 'red' }}>{emailCheckError}</small>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: RIGHT_COL_WIDTH }}>
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  onClick={handleSendCode}
                  disabled={sendingCode || isLoading || emailExists === true}
                  style={{ width: '100%' }}
                >
                  {sendingCode ? '寄送中…' : '驗證'}
                </Button>
              </div>
            </div>

            {/* Send button appears first; after successful send we reveal the input + confirm button below */}
            {/* <div style={{ marginTop: '8px' }}>
              <Button
                type="button"
                variant="primary"
                size="medium"
                onClick={handleSendCode}
                disabled={sendingCode || isLoading || emailExists === true}
                style={{ width: 120 }}
              >
                {sendingCode ? '寄送中…' : '寄驗證信'}
              </Button>
            </div> */}

            {sentVerification && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    type="text"
                    label=""
                    name="verificationCode"
                    placeholder="輸入驗證碼"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    error={''}
                    disabled={isLoading || verifyingCode || emailVerified}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ width: RIGHT_COL_WIDTH }}>
                  <Button
                    type="button"
                    variant="primary"
                    size="medium"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || isLoading || emailVerified}
                    style={{ width: '100%' }}
                  >
                    {verifyingCode ? '驗證中…' : (emailVerified ? '已驗證' : '確認')}
                  </Button>
                </div>
              </div>
            )}

            {/* No preview or dev-code shown in production; real SMTP required for delivery */}

            {/* Password */}
            <div>
              <Input
                type="password"
                label="密碼"
                name="password"
                placeholder="8-20 字元，包含字母、數字、特殊符號"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              {formData.password && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginTop: 'var(--spacing-xs)'
                }}>
                  <div style={{
                    flex: 1,
                    height: 4,
                    background: 'var(--gray-200)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${passwordStrength * 25}%`,
                      background: passwordStrength === 1 ? '#FF6B6B' :
                        passwordStrength === 2 ? '#FFA94D' :
                          passwordStrength === 3 ? '#51CF66' : '#12B886',
                      transition: 'all var(--transition-base)',
                      borderRadius: 'var(--radius-sm)'
                    }}></div>
                  </div>
                  <span className="text-tiny" style={{
                    minWidth: 60,
                    fontWeight: 500,
                    color: passwordStrength === 1 ? '#FF6B6B' :
                      passwordStrength === 2 ? '#FFA94D' :
                        passwordStrength === 3 ? '#51CF66' : '#12B886'
                  }}>
                    {passwordStrength === 0 ? '' :
                      passwordStrength === 1 ? '弱' :
                        passwordStrength === 2 ? '中' :
                          passwordStrength === 3 ? '強' : '非常強'}
                  </span>
                </div>
              )}
            </div>

            {/* Password Confirm */}
            <Input
              type="password"
              label="確認密碼"
              name="password_confirm"
              placeholder="請再次輸入密碼"
              value={formData.password_confirm}
              onChange={handleChange}
              error={errors.password_confirm}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />

            {/* Gender */}
            <Select
              label="性別"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              error={errors.gender}
              required
              disabled={isLoading}
              options={[
                { value: 'male', label: '男' },
                { value: 'female', label: '女' },
                { value: 'other', label: '其他' },
                { value: 'prefer_not_to_say', label: '不透露' }
              ]}
              placeholder="請選擇性別"
            />

            {/* Birth Date */}
            <Input
              type="date"
              label="生日"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              error={errors.birth_date}
              required
              disabled={isLoading}
              helperText="必須年滿 13 歲"
              autoComplete="bday"
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={isLoading}
              style={{ width: '100%', height: '45px', marginTop: 'var(--spacing-md)' }}
            >
              {isLoading ? '註冊中...' : '註冊'}
            </Button>
          </form>

          <div className="form-footer">
            已經有帳號了？ <Link to="/login" className="form-link">立即登入</Link>
          </div>
        </div>
      </div >
    </div >
  );
}

export default RegisterPage;
