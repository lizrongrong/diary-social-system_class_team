import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './AuthPages.css';

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData);
      addToast('登入成功！', 'success');
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.message || '登入失敗，請檢查您的帳號密碼';
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // no guest button needed for auth pages

  return (
    <div className="register-page">
      {/* Header */}
      {/* <header className="register-header">
        <h1 className="register-logo">Resonote</h1>
      </header> */}

      {/* Main Content */}
      <main className="register-main">
        <div className="register-form-container">
          <div className="register-form-header">
            <h2 className="form-title">登入</h2>
            <p className="form-subtitle">歡迎回來，繼續你的日記旅程</p>
          </div>
          <form onSubmit={handleSubmit} className="register-form">
            {/* Email Input */}
            <Input
              type="email"
              label="帳號"
              name="email"
              placeholder="請輸入 Email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete="email"
            />

            {/* Password Input */}
            <Input
              type="password"
              label="密碼"
              name="password"
              placeholder="請輸入密碼"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />

            {/* (remember_me removed) */}

            {/* Login Button (use shared Button component for consistent styles) */}
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              {isLoading ? '登入中...' : '登入'}
            </Button>
          </form>

          {/* Footer Links (use Register page link style) */}
          <div className="form-footer">
            <Link to="/forgot-password" className="form-link">忘記密碼？</Link>
            <span style={{ margin: '0 8px', color: '#666' }}>·</span>
            <Link to="/register" className="form-link">建立新帳號</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
