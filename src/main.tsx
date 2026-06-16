import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n'; // Initialize i18n before App renders
import { initSentry } from './utils/sentry';

// Initialize Sentry before anything else (no-op when VITE_SENTRY_DSN is absent)
initSentry();

// Legacy Supabase dev utilities removed (Feb 2026) — backend is now Convex.
// Use `npx convex dashboard` for data inspection and debugging.

import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
