import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './themes.css';
import './index.css';

// 忽略 ResizeObserver 的循环错误（这是一个已知的浏览器问题，不影响功能）
// 方法1: 捕获 error 事件
window.addEventListener('error', (e) => {
  if (
    e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
    e.message === 'ResizeObserver loop limit exceeded'
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
});

// 方法2: 捕获未处理的 promise rejection
window.addEventListener('unhandledrejection', (e) => {
  if (
    e.reason?.message === 'ResizeObserver loop completed with undelivered notifications.' ||
    e.reason?.message === 'ResizeObserver loop limit exceeded'
  ) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
});

// 方法3: 包装 ResizeObserver
const originalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends originalResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    super((entries, observer) => {
      window.requestAnimationFrame(() => {
        callback(entries, observer);
      });
    });
  }
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
