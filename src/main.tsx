import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import './index.css';
import { initAudioEventObserver } from './ui/audio/audio-event-observer';
import { initWasmCore } from './engine/wasm-bridge';

// Khởi tạo Observer âm thanh toàn cục lắng nghe GameEventBus
initAudioEventObserver();

// Khởi tạo Rust WebAssembly Core Engine chạy song song khi load trang
initWasmCore().catch(err => console.warn('[Wasm] Core init warning:', err));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Đăng ký Service Worker cho PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[PWA] ServiceWorker registration failed:', err);
    });
  });
}
