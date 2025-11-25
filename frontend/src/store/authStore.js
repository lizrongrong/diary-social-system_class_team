import { create } from 'zustand';
import api from '../services/api';
import announcementAPI from '../services/announcementAPI';
import { generateAvatarDataUrl } from '../utils/avatar';

const TOKEN_KEY = 'token'
const USER_KEY = 'authUser'

const withAvatarFallback = (user) => {
  if (!user) return null
  const next = { ...user }
  const seed = user.username || user.user_id || user.email || 'User'
  const fallback = generateAvatarDataUrl(seed)

  if (!next.profile_image && !next.avatar_url) {
    next.profile_image = fallback
    next.avatar_url = fallback
  } else if (!next.profile_image) {
    next.profile_image = next.avatar_url || fallback
  } else if (!next.avatar_url) {
    next.avatar_url = next.profile_image || fallback
  }

  return next
}

const getStoredToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch (error) {
    console.error('Failed to read auth token from sessionStorage', error)
    return null
  }
}

const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    return raw ? withAvatarFallback(JSON.parse(raw)) : null
  } catch (error) {
    try {
      sessionStorage.removeItem(USER_KEY)
    } catch (_) {
      // ignore cleanup failures
    }
    console.error('Failed to read auth user from sessionStorage', error)
    return null
  }
}

const persistUser = (user) => {
  try {
    if (user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      sessionStorage.removeItem(USER_KEY)
    }
  } catch (error) {
    console.error('Failed to persist auth user in sessionStorage', error)
  }
}

const initialToken = getStoredToken()
const initialUser = getStoredUser()

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  // Use sessionStorage for token (cleared on tab/window close). Remember-me/localStorage removed.
  token: initialToken,
  isAuthenticated: !!initialToken,
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
      const normalizedUser = withAvatarFallback(user)
      // Always store token + user snapshot in sessionStorage (no remember-me persistence).
      sessionStorage.setItem(TOKEN_KEY, token);
      persistUser(normalizedUser);
      set({
        user: normalizedUser,
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
          try { if (merged.length > 0) localStorage.setItem(key, JSON.stringify(merged)) } catch (e) { }
          // if we migrated guest reads, remove guest key
          try { if ((guest || []).length > 0) localStorage.removeItem('ann_reads_v1:guest') } catch (e) { }
          // notify any UI components to refresh
          try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) { }
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
      const normalizedUser = withAvatarFallback(user)

      sessionStorage.setItem(TOKEN_KEY, token);
      persistUser(normalizedUser);
      set({
        user: normalizedUser,
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
          try { if (merged.length > 0) localStorage.setItem(key, JSON.stringify(merged)) } catch (e) { }
          try { if ((guest || []).length > 0) localStorage.removeItem('ann_reads_v1:guest') } catch (e) { }
          try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) { }
        } catch (e) { }
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
          try { localStorage.setItem(k, preserved[k]) } catch (e) { }
        });
      } catch (e) {
        // If anything goes wrong, fall back to clearing everything
        try { sessionStorage.clear(); localStorage.clear(); } catch (ex) { }
      }

      // 清除所有 cookies
      document.cookie.split(";").forEach(function (c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      persistUser(null);
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
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      const fetchedUser = withAvatarFallback(response.data.user)
      persistUser(fetchedUser)
      set({
        user: fetchedUser,
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
              try { localStorage.setItem(key, JSON.stringify(merged)) } catch (e) { }
            }
            if ((guest || []).length > 0) {
              try { localStorage.removeItem(guestKey) } catch (e) { }
            }
            try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) { }
          } catch (e) {
            // fallback: merge existing + guest
            const merged = Array.from(new Set([...(existing || []), ...(guest || [])]))
            if (merged.length > 0) {
              try { localStorage.setItem(key, JSON.stringify(merged)) } catch (e) { }
            }
            if ((guest || []).length > 0) {
              try { localStorage.removeItem(guestKey) } catch (e) { }
            }
            try { window.dispatchEvent(new Event('announcements:updated')) } catch (e) { }
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
        sessionStorage.removeItem(TOKEN_KEY);
        persistUser(null);
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
        // loading flag but retain the previously cached user snapshot so the UI
        // keeps the avatar and user context until the next successful fetch.
        set({
          isLoading: false,
          error: null
        });
      }
    }
  },

  /**
   * 更新使用者快取（例如重新抓取 profile 後）
   */
  setUserData: (updater) => {
    const current = get().user || {}
    const next = typeof updater === 'function' ? updater(current) : updater
    if (!next) return
    const normalized = withAvatarFallback(next)
    persistUser(normalized)
    set({ user: normalized })
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
        try { localStorage.setItem(k, preserved[k]) } catch (e) { }
      });
    } catch (e) {
      try { localStorage.clear(); } catch (ex) { }
    }

    // 清除 cookies
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // 清除 sessionStorage
    sessionStorage.clear();
    persistUser(null);

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
