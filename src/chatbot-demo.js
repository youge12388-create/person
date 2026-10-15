const notify = (type) => window.parent.postMessage({ type }, window.location.origin);
const script = document.createElement('script');
script.src = 'https://chatbot.medicalchinaway.com/widget.js';
script.dataset.siteId = 'cmscjd8cu003fzzdecnk93cpd';
script.dataset.siteKey = 'site-df527234706ddf84977c1ba17a4ae28d56b558393f2e52eb';
script.dataset.apiHost = 'https://chatbot.medicalchinaway.com';
script.async = true;

// 等待界面挂载；脚本下载完成不能代表客服界面已经可用。
const observer = new MutationObserver(() => {
  const host = [...document.body.children].find((element) => element.shadowRoot);
  if (host?.shadowRoot.querySelector('button')) {
    observer.disconnect();
    clearTimeout(timeout);
    notify('resume-chatbot-ready');
  }
});
observer.observe(document.body, { childList: true, subtree: true });
const timeout = setTimeout(() => { observer.disconnect(); notify('resume-chatbot-error'); }, 18000);
script.onerror = () => { clearTimeout(timeout); observer.disconnect(); notify('resume-chatbot-error'); };
document.body.appendChild(script);
window.addEventListener('pagehide', () => { clearTimeout(timeout); observer.disconnect(); }, { once: true });
