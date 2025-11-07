import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
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
      
      localStorage.setItem('token', token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      return response.data;
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
      
      localStorage.setItem('token', token);
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
    const token = localStorage.getItem('token');
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
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      } else {
        // For transient errors (network, 5xx, or unknown 401 without clear code),
        // keep the token and treat the user as still authenticated to avoid
        // immediate redirect-to-login on page navigation. We still clear the
        // loading flag and keep user=null until a successful fetch.
        set({
          user: null,
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
