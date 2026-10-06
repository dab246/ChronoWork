import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { installRipple } from './ui/ripple';
import './index.css';

const SPLASH_MIN_MS = 900;

/** Fades out the splash screen from index.html once the app has rendered (kept visible at least SPLASH_MIN_MS). */
function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const wait = Math.max(0, SPLASH_MIN_MS - performance.now());
  setTimeout(() => {
    splash.classList.add('splash-hidden');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), 800);
  }, wait);
}

installRipple();
createRoot(document.getElementById('root')!).render(<App onReady={hideSplash} />);
