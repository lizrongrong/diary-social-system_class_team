import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Heuristic to distinguish refresh (reload) from close/restore.
// Approach:
// - On unload, write a small marker to localStorage (persists across tabs/close).
// - On load, check the navigation type. If it's a reload, remove the marker and keep sessionStorage token.
// - If it's not a reload and a marker exists, clear sessionStorage token so the user must re-login.
// This helps cover browsers that restore sessionStorage on session-restore; it's a best-effort heuristic.
try {
  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem('last_unload_ts', String(Date.now()));
    } catch (e) {
      // ignore
    }
  });

  window.addEventListener('load', () => {
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      const navType = (navEntries && navEntries[0] && navEntries[0].type) || (performance.navigation && performance.navigation.type === 1 ? 'reload' : 'navigate');

      const last = localStorage.getItem('last_unload_ts');
      if (navType === 'reload') {
        // keep session token on refresh, but clear the marker
        localStorage.removeItem('last_unload_ts');
      } else {
        // Not a reload — if we have a recent unload marker, assume the previous session ended and clear session token
        if (last) {
          try { sessionStorage.removeItem('token'); } catch (e) {}
          localStorage.removeItem('last_unload_ts');
        }
      }
    } catch (e) {
      // ignore errors here to avoid breaking app startup
    }
  });
} catch (e) {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
