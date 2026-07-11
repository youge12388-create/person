(function () {
  'use strict';

  // 修复 canhuo 客服挂件两个问题：
  // 1. widget.js 把宿主样式误写进 Shadow DOM 内部（应用 :host 才对），
  //    导致 position:fixed 不作用于宿主，挂件沉到文档末尾。
  //    这里用 inline style 直接设置宿主，优先级最高且不污染全局 CSS。
  // 2. widget.js 按钮只有 click 没有 drag，这里补上拖动 + 位置记忆。

  var WIDGET_SELECTOR = '.chat-widget-container';
  var BUTTON_SELECTOR = '.chat-widget-button';
  var STORAGE_KEY = 'chat_widget_pos';
  var DRAG_THRESHOLD = 4; // 移动超过 4px 视为拖动而非点击

  function readSavedPosition() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function savePosition(container) {
    var rect = container.getBoundingClientRect();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        top: rect.top,
        left: rect.left,
      }));
    } catch (e) {
      // 忽略存储失败
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyPosition(container) {
    container.style.zIndex = '999999';
    container.style.bottom = 'auto';

    var saved = readSavedPosition();
    if (saved) {
      container.style.top = saved.top + 'px';
      container.style.left = saved.left + 'px';
      container.style.right = 'auto';
      container.style.transform = 'none';
    } else {
      container.style.top = '50%';
      container.style.right = '20px';
      container.style.left = 'auto';
      container.style.transform = 'translateY(-50%)';
    }
  }

  function enableDrag(container, button) {
    var dragging = false;
    var moved = false;
    var startX = 0, startY = 0;
    var startTop = 0, startLeft = 0;

    function beginDrag(clientX, clientY) {
      var rect = container.getBoundingClientRect();
      startX = clientX;
      startY = clientY;
      startTop = rect.top;
      startLeft = rect.left;
      moved = false;
      dragging = true;
      button.style.cursor = 'grabbing';
    }

    function updateDrag(clientX, clientY) {
      if (!dragging) return;
      var dx = clientX - startX;
      var dy = clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        moved = true;
      }
      if (!moved) return;
      var newLeft = clamp(startLeft + dx, 0, window.innerWidth - container.offsetWidth);
      var newTop = clamp(startTop + dy, 0, window.innerHeight - container.offsetHeight);
      container.style.top = newTop + 'px';
      container.style.left = newLeft + 'px';
      container.style.right = 'auto';
      container.style.transform = 'none';
    }

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      button.style.cursor = 'pointer';
      if (moved) {
        savePosition(container);
        // 拖动后阻止本次 click，避免误触打开聊天窗口
        var blocker = function (e) {
          e.stopPropagation();
          e.preventDefault();
          button.removeEventListener('click', blocker, true);
        };
        button.addEventListener('click', blocker, true);
      }
    }

    button.style.cursor = 'grab';

    // 桌面端
    button.addEventListener('mousedown', function (e) {
      beginDrag(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      updateDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', endDrag);

    // 移动端
    button.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      beginDrag(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.touches[0];
      updateDrag(t.clientX, t.clientY);
      if (moved) e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchend', endDrag);
  }

  function setupWidget() {
    var container = document.querySelector(WIDGET_SELECTOR);
    if (!container) {
      // widget.js 异步创建容器，轮询等待
      setTimeout(setupWidget, 300);
      return;
    }
    if (container.dataset.widgetFixed) return;
    container.dataset.widgetFixed = '1';

    applyPosition(container);

    var shadowRoot = container.shadowRoot;
    if (!shadowRoot) return;
    var button = shadowRoot.querySelector(BUTTON_SELECTOR);
    if (!button) return;

    enableDrag(container, button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWidget);
  } else {
    setupWidget();
  }
})();
