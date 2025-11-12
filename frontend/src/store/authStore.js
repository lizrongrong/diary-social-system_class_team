import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  // Use sessionStorage for token (cleared on tab/window close). Remember-me/localStorage removed.
  token: sessionStorage.getItem('token'),
  isAuthenticated: !!sessionStorage.getItem('token'),
  isLoading: false,
  error: null,

  /**
   * 使用者登入
   */
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;
      // Always store token in sessionStorage (no remember-me persistence).
      sessionStorage.setItem('token', token);

      // If backend already returned user in the login response, use it.
      // Otherwise, fetch /auth/me to obtain the current user and avoid
      // races where navigation happens before user data is populated.
      let resolvedUser = user || null;
      if (!resolvedUser) {
        try {
          const meRes = await api.get('/auth/me');
          resolvedUser = meRes.data?.user || null;
        } catch (e) {
          // If /auth/me fails, don't clear the token here. We'll keep the
          // token and surface a non-fatal error — the app can still try
          // fetching user later. Avoid overwriting any existing user.
          console.warn('login: fetch /auth/me failed', e);
        }
      }

      set({
        user: resolvedUser,
        token,
        isAuthenticated: !!token,
        isLoading: false,
        error: null
      });

      return { token, user: resolvedUser };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '登入失敗';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * 使用者註冊
   */
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      
  sessionStorage.setItem('token', token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || '註冊失敗';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  /**
   * 使用者登出
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 清除所有 localStorage
  // Clear sessionStorage token (session-based) and localStorage fallback
  sessionStorage.clear();
  localStorage.clear();
      
      // 清除所有 cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null
      });
      
      // 重新載入頁面確保狀態完全清除
      window.location.href = '/login';
    }
  },

  /**
   * 取得當前使用者資料
   */
  fetchUser: async () => {
  // Read token from sessionStorage only (remember-me removed)
  const token = sessionStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }
    
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      // Only clear token / force logout for explicit auth failures.
      const code = error.response?.data?.code;
      const authFailureCodes = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'NO_TOKEN', 'USER_NOT_FOUND'];
      if (code && authFailureCodes.includes(code)) {
        sessionStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      } else {
        // For transient errors (network, 5xx, or unknown 401 without clear code),
        // keep the token and treat the user as still authenticated to avoid
        // immediate redirect-to-login on page navigation. Do NOT overwrite any
        // existing `user` value here because that can erase a valid user when
        // /auth/me temporarily fails. Only clear loading/error flags.
        set({
          isLoading: false,
          error: null
        });
      }
    }
  },

  /**
   * 清除錯誤訊息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 清除所有本地數據（Cookie + LocalStorage）
   */
  clearAllData: () => {
    // 清除 localStorage
    localStorage.clear();
    
    // 清除 cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // 清除 sessionStorage
    sessionStorage.clear();
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
    
    console.log('✅ 所有本地數據已清除');
  }
}));

export default useAuthStore;
