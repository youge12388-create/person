const STORAGE_KEY = 'particle-nav-transition-v1';
const TRANSITION_TTL_MS = 4500;
const EVENT_NAME = 'particle-title:trigger';

let initialized = false;
let pendingPageBurstActive = false;
let pageBurstChecked = false;

function readAndConsumePageFlag() {
  if (pageBurstChecked) return pendingPageBurstActive;
  pageBurstChecked = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.ts === 'number' && Date.now() - parsed.ts <= TRANSITION_TTL_MS) {
      pendingPageBurstActive = true;
      window.setTimeout(() => {
        pendingPageBurstActive = false;
      }, 1200);
      return true;
    }
  } catch {
    // 忽略隐私模式或存储不可用异常
  }
  return false;
}

export function hasPendingPageTransition() {
  return readAndConsumePageFlag();
}

export function dispatchParticleBurst(detail = {}) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

export function subscribeParticleBurst(handler) {
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

function isModifiedClick(event) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/index.html';
  return pathname.endsWith('/') ? `${pathname}index.html` : pathname;
}

function handleDocumentClick(event) {
  if (event.defaultPrevented || isModifiedClick(event)) return;
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor) return;
  if (anchor.hasAttribute('download')) return;
  const targetAttr = anchor.getAttribute('target');
  if (targetAttr && targetAttr !== '_self') return;

  const rawHref = anchor.getAttribute('href')?.trim();
  if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
    return;
  }

  let url;
  try {
    url = new URL(rawHref, window.location.href);
  } catch {
    return;
  }

  if (url.origin !== window.location.origin) return;

  const samePage = normalizePath(url.pathname) === normalizePath(window.location.pathname)
    && url.search === window.location.search;

  if (samePage) {
    if (!url.hash) return;
    const targetId = decodeURIComponent(url.hash.slice(1));
    if (!targetId) return;
    dispatchParticleBurst({
      mode: 'anchor',
      targetId,
      timestamp: Date.now(),
    });
    return;
  }

  // 跨页站内跳转：写入短暂有效标记，供目标页文字粒子加载后自动触发震动打散重组
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ts: Date.now(),
        hash: url.hash ? decodeURIComponent(url.hash.slice(1)) : '',
      }),
    );
  } catch {
    // 忽略存储写入异常
  }
}

export function initParticleNavigationBridge() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  readAndConsumePageFlag();
  document.addEventListener('click', handleDocumentClick, true);
}
