import { create } from 'zustand';
import api from '../services/api';
import announcementAPI from '../services/announcementAPI';

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
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      // After login, synchronize server-side read IDs into localStorage for this user
      (async () => {
        try {
          const key = `ann_reads_v1:${user.user_id}`
          // fetch server reads
          const resp = await announcementAPI.getReadsForUser()
          const serverIds = resp.read_ids || []
          // merge with any existing local user reads and guest reads
          let existing = []
          try { existing = JSON.parse(localStorage.getItem(key) || '[]') } catch (e) { existing = [] }
          let guest = []
          try { guest = JSON.parse(localStorage.getItem('ann_reads_v1:guest') || '[]') } catch (e) { guest = [] }
          const merged = Array.from(new Set([...(serverIds || []), ...(existing || []), ...(guest || [])]))
          try { if (merged.length > 0) localStorage.setItem(key, JSON.stringify(merged)) } catch (e) {}
          // if we migrated guest reads, remove guest key
          try { if ((guest || []).length > 0) localStorage.removeItem('ann_reads_v1:guest') } catch (e) {}
          // notify any UI components to refresh
          try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) {}
        } catch (e) {
          // ignore sync errors
        }
      })()
      
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
      
  sessionStorage.setItem('token', token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      // After register, behave like login: sync reads (unlikely to have server reads yet)
      (async () => {
        try {
          const key = `ann_reads_v1:${user.user_id}`
          let existing = []
          try { existing = JSON.parse(localStorage.getItem(key) || '[]') } catch (e) { existing = [] }
          let guest = []
          try { guest = JSON.parse(localStorage.getItem('ann_reads_v1:guest') || '[]') } catch (e) { guest = [] }
          const merged = Array.from(new Set([...(existing || []), ...(guest || [])]))
          try { if (merged.length > 0) localStorage.setItem(key, JSON.stringify(merged)) } catch (e) {}
          try { if ((guest || []).length > 0) localStorage.removeItem('ann_reads_v1:guest') } catch (e) {}
          try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) {}
        } catch (e) {}
      })()
      
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
      // Preserve announcement read keys across logout so "已讀"標記不會因登出而遺失
      try {
        const preserved = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('ann_reads_v1:')) {
            preserved[k] = localStorage.getItem(k);
          }
        }
        // Clear storages
        sessionStorage.clear();
        localStorage.clear();
        // Restore preserved announcement keys
        Object.keys(preserved).forEach(k => {
          try { localStorage.setItem(k, preserved[k]) } catch (e) {}
        });
      } catch (e) {
        // If anything goes wrong, fall back to clearing everything
        try { sessionStorage.clear(); localStorage.clear(); } catch (ex) {}
      }
      
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
      // After fetching user on app init, synchronize server read IDs into localStorage
      (async () => {
        try {
          const user = response.data.user
          if (!user) return
          const key = `ann_reads_v1:${user.user_id}`
          const guestKey = 'ann_reads_v1:guest'
          let existing = []
          try { existing = JSON.parse(localStorage.getItem(key) || '[]') } catch (e) { existing = [] }
          let guest = []
          try { guest = JSON.parse(localStorage.getItem(guestKey) || '[]') } catch (e) { guest = [] }
          try {
            const resp = await announcementAPI.getReadsForUser()
            const serverIds = resp.read_ids || []
            const merged = Array.from(new Set([...(serverIds || []), ...(existing || []), ...(guest || [])]))
            if (merged.length > 0) {
              try { localStorage.setItem(key, JSON.stringify(merged)) } catch (e) {}
            }
            if ((guest || []).length > 0) {
              try { localStorage.removeItem(guestKey) } catch (e) {}
            }
            try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) {}
          } catch (e) {
            // fallback: merge existing + guest
            const merged = Array.from(new Set([...(existing || []), ...(guest || [])]))
            if (merged.length > 0) {
              try { localStorage.setItem(key, JSON.stringify(merged)) } catch (e) {}
            }
            if ((guest || []).length > 0) {
              try { localStorage.removeItem(guestKey) } catch (e) {}
            }
            try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) {}
          }
        } catch (e) {
          // ignore
        }
      })()
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
    // 清除 localStorage but preserve announcement read keys to avoid losing read state
    try {
      const preserved = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ann_reads_v1:')) preserved[k] = localStorage.getItem(k);
      }
      localStorage.clear();
      Object.keys(preserved).forEach(k => {
        try { localStorage.setItem(k, preserved[k]) } catch (e) {}
      });
    } catch (e) {
      try { localStorage.clear(); } catch (ex) {}
    }
    
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
