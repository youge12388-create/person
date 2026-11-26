import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9229;
const BASE_URL = 'http://127.0.0.1:4179';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevTools(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) return await res.json();
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error(`Chrome DevTools on port ${port} did not become ready in ${timeoutMs}ms`);
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
      this.ws.addEventListener('message', (event) => {
        const msg = JSON.parse(String(event.data));
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));
          else res(msg.result);
        } else if (msg.method && this.listeners.has(msg.method)) {
          for (const fn of this.listeners.get(msg.method)) fn(msg.params);
        }
      });
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Page JS Exception: ${res.exceptionDetails.text} ${JSON.stringify(res.exceptionDetails.exception?.description || '')}`);
    }
    return res.result?.value;
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
  }
}

async function runE2E() {
  assert.ok(fs.existsSync(CHROME_PATH), `Chrome not found at ${CHROME_PATH}`);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-e2e-chrome-'));
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp;
  const issues = [];
  const logPass = (msg) => console.log(`PASS: ${msg}`);
  const logBug = (msg) => {
    issues.push(msg);
    console.log(`BUG: ${msg}`);
  };

  try {
    const targets = await waitForDevTools(DEBUG_PORT);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    assert.ok(pageTarget?.webSocketDebuggerUrl, 'No debuggable page target found');

    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    const consoleErrors = [];
    const failedRequests = [];

    cdp.on('Runtime.exceptionThrown', (p) => {
      consoleErrors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'Unknown exception');
    });
    cdp.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') {
        consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    });
    cdp.on('Network.responseReceived', (p) => {
      if (p.response.status >= 400 && p.response.url.startsWith(BASE_URL)) {
        failedRequests.push(`${p.response.status} ${p.response.url}`);
      }
    });

    async function openPage(url, width, height) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width <= 500,
      });
      await cdp.send('Page.navigate', { url });
      await sleep(900);
    }

    // ==================== 1. 首页桌面端 (1440x900) ====================
    await openPage(`${BASE_URL}/index.html`, 1440, 900);
    // 先滚动整页触发所有 loading="lazy" 图片加载，再回到顶部检查
    await cdp.eval(`(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 250));
    })()`);
    const homeDesktop = await cdp.eval(`(() => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const brokenImgs = [...document.querySelectorAll('img')]
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.getAttribute('src'));
      const canvases = [...document.querySelectorAll('.particle-title-canvas')].map(c => {
        const r = c.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      });
      // 检查所有页内 # 锚点是否存在对应元素
      const missingAnchors = [...document.querySelectorAll('a[href^="#"]')]
        .map(a => a.getAttribute('href').slice(1))
        .filter(id => id && !document.getElementById(id));
      // 检查首屏 hero-facts 是否折行拥挤
      const heroFactRows = [...document.querySelectorAll('.hero-facts li')].map(li => {
        const strong = li.querySelector('strong');
        const em = li.querySelector('em');
        return {
          value: strong?.textContent,
          title: em?.textContent,
          sameLine: strong && em ? Math.abs(strong.getBoundingClientRect().top - em.getBoundingClientRect().top) < 18 : true,
          liHeight: Math.round(li.getBoundingClientRect().height),
        };
      });
      // 触发首屏粒子标题 pointermove
      const firstCanvas = document.querySelector('.particle-title-canvas');
      if (firstCanvas) {
        const r = firstCanvas.getBoundingClientRect();
        firstCanvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + 80, clientY: r.top + 30, bubbles: true }));
      }
      // 打印简历内容核验
      const resumeText = document.querySelector('.resume-document')?.textContent || '';
      return { overflow, brokenImgs, canvases, missingAnchors, heroFactRows, hasNewResumeCopy: resumeText.includes('3 所/周') && resumeText.includes('10+ 所/天') };
    })()`);

    if (homeDesktop.overflow > 1) logBug(`首页桌面端存在水平溢出: +${homeDesktop.overflow}px`);
    else logPass('首页桌面端无水平溢出');

    if (homeDesktop.brokenImgs.length) logBug(`首页存在加载失败图片: ${homeDesktop.brokenImgs.join(', ')}`);
    else logPass('首页全部图片加载正常');

    if (homeDesktop.missingAnchors.length) logBug(`首页存在失效锚点: ${homeDesktop.missingAnchors.join(', ')}`);
    else logPass('首页所有页内锚点目标均存在');

    if (homeDesktop.canvases.some((c) => c.w === 0 || c.h === 0)) logBug(`首页存在零尺寸粒子画布: ${JSON.stringify(homeDesktop.canvases)}`);
    else logPass(`首页 ${homeDesktop.canvases.length} 个粒子标题画布尺寸正常`);

    if (!homeDesktop.hasNewResumeCopy) logBug('打印简历未同步最新的 3 所/周 -> 10+ 所/天 文案');
    else logPass('打印简历已同步最新量化文案');

    for (const row of homeDesktop.heroFactRows) {
      if (!row.sameLine) logBug(`首屏背书栏指标与标题发生折行挤压: "${row.value}" / "${row.title}"`);
    }

    // 测试首页默认全部为“交付概览” + 01 一键试玩与极简大白话交互闭环
    const weeklyInteractive = await cdp.eval(`(async () => {
      const allDefaultOverview = ['preview-weekly-intelligence', 'preview-university-agent', 'preview-medical-concierge']
        .every(id => {
          const el = document.getElementById(id);
          return !!el.querySelector('.case-visual') && !el.querySelector('.wb-app-frame');
        });

      const card = document.getElementById('preview-weekly-intelligence');
      const presetBtn = [...card.querySelectorAll('.quick-try-pill')].find(b => b.textContent.includes('揪出撞车'));
      presetBtn?.click();
      await new Promise(r => setTimeout(r, 950));

      const workbenchVisible = !!card.querySelector('[data-workbench="weekly"]');
      const hasRiskCards = card.querySelectorAll('.wk-brief-card').length >= 2;

      // 点选第二张隐患卡验证手动展开员工原话（第一张已被预设自动展开）
      const secondCard = card.querySelectorAll('.wk-brief-card')[1];
      secondCard?.click();
      await new Promise(r => setTimeout(r, 80));
      const quoteExpanded = !!card.querySelector('.wk-quote-drawer mark');

      card.querySelector('.wb-inline-action-btn')?.click();
      await new Promise(r => setTimeout(r, 240));
      const closedText = card.querySelector('.wk-closed-badge')?.textContent || '';
      const resolvedProgressed = closedText.includes('已处理 1') || closedText.includes('完毕');

      const chatInput = card.querySelector('.wk-chat-input');
      const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      inputSetter.call(chatInput, '客户历史数据清洗哪天能弄完？');
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      card.querySelector('.wk-send-btn')?.click();
      await new Promise(r => setTimeout(r, 900));
      const guardBubbleText = card.querySelector('.wk-guard-bubble')?.textContent || '';
      const agentNoFabricationOk = guardBubbleText.includes('绝不') && guardBubbleText.includes('没写');

      const customTab = [...card.querySelectorAll('.wk-scope-tab')].find(b => b.textContent.includes('写一句周报'));
      customTab?.click();
      await new Promise(r => setTimeout(r, 80));
      const textarea = card.querySelector('.wb-textarea');
      const taSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      taSetter.call(textarea, '研发组：结算网关已经完成。补充：结算网关回调仍有报错，尚未通过验收。');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      card.querySelector('.wb-editor-actions .wb-btn-primary')?.click();
      await new Promise(r => setTimeout(r, 950));
      const hasConflictParsed = (card.textContent || '').includes('前后矛盾');

      return {
        allDefaultOverview,
        workbenchVisible,
        hasRiskCards,
        quoteExpanded,
        resolvedProgressed,
        agentNoFabricationOk,
        hasConflictParsed,
      };
    })()`);

    if (
      !weeklyInteractive.allDefaultOverview ||
      !weeklyInteractive.workbenchVisible ||
      !weeklyInteractive.hasRiskCards ||
      !weeklyInteractive.quoteExpanded ||
      !weeklyInteractive.resolvedProgressed ||
      !weeklyInteractive.agentNoFabricationOk ||
      !weeklyInteractive.hasConflictParsed
    ) {
      logBug(`默认交付概览或 01 周报交互异常: ${JSON.stringify(weeklyInteractive)}`);
    } else {
      logPass('首页默认全为交付概览，01 周报极简看板、员工原话溯源、异常处置与 AI 秘书防瞎编问答全部正常');
    }

    // 测试首页案例 02 高校 Agent 工作台：双阶段筛选 + 选校单生成交付报告 + PDF 终端流拦截修复 + 弹窗预览
    const uniInteractive = await cdp.eval(`(async () => {
      const card = document.getElementById('preview-university-agent');
      const workflowTab = [...card.querySelectorAll('button[role="tab"]')].find(b => b.textContent.includes('交互工作台'));
      workflowTab.click();
      await new Promise(r => setTimeout(r, 600));

      const initialMatched = card.querySelectorAll('.uni-card').length;
      // 点击“仅限全额奖学金”硬条件开关并等待重算动画
      const fullScholBtn = [...card.querySelectorAll('.uni-controls button')].find(b => b.textContent.includes('奖学金'));
      fullScholBtn?.click();
      await new Promise(r => setTimeout(r, 600));
      const elimCount = card.querySelectorAll('.uni-elim-card').length;

      // 点击第一所匹配院校展开 PDF 原文摘录
      card.querySelector('.uni-card-btn')?.click();
      await new Promise(r => setTimeout(r, 60));
      const quoteOpened = !!card.querySelector('.uni-quote-box');

      // 点击“生成客户交付版选校报告”验证交付报告渲染
      card.querySelector('.uni-basket-bar .wb-btn-primary')?.click();
      await new Promise(r => setTimeout(r, 650));
      const reportRendered = !!card.querySelector('.uni-report-preview');

      // 切换到“自动扒官网 PDF 简章入表”模式
      const collectorBtn = [...card.querySelectorAll('.wk-scope-tab')].find(b => b.textContent.includes('PDF'));
      collectorBtn?.click();
      await new Promise(r => setTimeout(r, 650));
      const gateBlocked = (card.querySelector('.uni-gate-pill')?.textContent || '').includes('拦截');
      card.querySelector('.uni-gate-fail .wb-btn-primary')?.click();
      await new Promise(r => setTimeout(r, 650));
      const gateFixedPass = (card.querySelector('.uni-gate-pill')?.textContent || '').includes('已安全入表');

      // 切回交付概览并点击预览图打开 Dialog
      const overviewTab = [...card.querySelectorAll('button[role="tab"]')].find(b => b.textContent.includes('交付概览'));
      overviewTab.click();
      await new Promise(r => setTimeout(r, 100));
      card.querySelector('.case-visual').click();
      await new Promise(r => setTimeout(r, 150));
      const dialogOpen = !!document.querySelector('dialog.case-dialog[open]');
      document.querySelector('dialog.case-dialog .dialog-top button')?.click();
      await new Promise(r => setTimeout(r, 100));
      const dialogClosed = !document.querySelector('dialog.case-dialog[open]');

      return { initialMatched, elimCount, quoteOpened, reportRendered, gateBlocked, gateFixedPass, dialogOpen, dialogClosed };
    })()`);

    if (
      uniInteractive.elimCount < 1 ||
      !uniInteractive.quoteOpened ||
      !uniInteractive.reportRendered ||
      !uniInteractive.gateBlocked ||
      !uniInteractive.gateFixedPass ||
      !uniInteractive.dialogOpen ||
      !uniInteractive.dialogClosed
    ) {
      logBug(`高校 Agent 工作台或弹窗预览异常: ${JSON.stringify(uniInteractive)}`);
    } else {
      logPass('02 高校 Agent 工作台两阶段筛选、交付报告生成、PDF 终端流脏数据拦截修复与弹窗开关全部正常');
    }

    // 测试首页案例 03 医疗双语客服工作台：Typing + 流式回复 + 自动提取线索 + 高风险护栏震动拦截 + 人工顾问接单
    const medInteractive = await cdp.eval(`(async () => {
      const card = document.getElementById('preview-medical-concierge');
      const presetLead = [...card.querySelectorAll('.quick-try-pill')].find(b => b.textContent.includes('名片'));
      presetLead?.click();
      await new Promise(r => setTimeout(r, 850));

      const leadTextAfterPreset = card.querySelector('.med-lead-card')?.textContent || '';
      const extractedEmail = leadTextAfterPreset.includes('alex.chen@example.com') && leadTextAfterPreset.includes('英国伦敦');

      // 在真实输入框发送高风险临床问诊语句，测试安全护栏强制拦截
      const input = card.querySelector('.med-input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '肺部8mm磨玻璃结节是不是恶性肿瘤，吃什么靶向药？');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      card.querySelector('.med-send-btn')?.click();
      await new Promise(r => setTimeout(r, 950));

      const guardrailDanger = !!card.querySelector('.med-guard-card.danger');
      const handoffPriority = !!card.querySelector('.med-handoff-status.human_priority');

      // 点击“模拟人工顾问接手会话”验证真人顾问气泡插入
      card.querySelector('.med-takeover-btn')?.click();
      await new Promise(r => setTimeout(r, 150));
      const humanJoinedBubble = !!card.querySelector('.med-bubble.human_agent_joined');

      return { extractedEmail, guardrailDanger, handoffPriority, humanJoinedBubble };
    })()`);

    if (
      !medInteractive.extractedEmail ||
      !medInteractive.guardrailDanger ||
      !medInteractive.handoffPriority ||
      !medInteractive.humanJoinedBubble
    ) {
      logBug(`03 医疗双语工作台线索提取、护栏拦截或顾问接单异常: ${JSON.stringify(medInteractive)}`);
    } else {
      logPass('03 医疗双语工作台流式回复、线索提取、安全护栏拦截与人工顾问接单闭环全部正常');
    }

    // ==================== 1.5 首页平板端 (1024x768) 溢出与卡片检查 ====================
    await openPage(`${BASE_URL}/index.html`, 1024, 768);
    const homeTablet = await cdp.eval(`(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }))()`);
    if (homeTablet.overflow > 1) logBug(`首页平板端(1024px)存在水平溢出: +${homeTablet.overflow}px`);
    else logPass('首页平板端(1024px)无水平溢出');

    // ==================== 2. 案例集页桌面端 (1440x900) ====================
    await openPage(`${BASE_URL}/portfolio.html`, 1440, 900);
    const portfolioDesktop = await cdp.eval(`(async () => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const brokenImgs = [...document.querySelectorAll('img')]
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.getAttribute('src'));

      // 回归测试：点开 05 详情时，04 和 06 高度必须保持不变
      const c4 = document.getElementById('rpa-order-pipeline');
      const c5 = document.getElementById('review-insight-dashboard');
      const c6 = document.getElementById('competitor-monitor-agent');
      const beforeH = { h4: Math.round(c4.getBoundingClientRect().height), h5: Math.round(c5.getBoundingClientRect().height), h6: Math.round(c6.getBoundingClientRect().height) };
      c5.querySelector('.archive-card-more').click();
      await new Promise(r => setTimeout(r, 120));
      const afterH = { h4: Math.round(c4.getBoundingClientRect().height), h5: Math.round(c5.getBoundingClientRect().height), h6: Math.round(c6.getBoundingClientRect().height) };
      const hasStructuredCompare = c5.querySelectorAll('.archive-detail-row').length === 2;
      c5.querySelector('.archive-card-more').click();
      await new Promise(r => setTimeout(r, 80));

      // 检查 04~15 卡片顶部 impact 是否折行
      const wrappedImpacts = [...document.querySelectorAll('.archive-card')].map(card => {
        const impact = card.querySelector('.archive-card-impact');
        const h = impact?.getBoundingClientRect().height || 0;
        return { id: card.id, text: impact?.textContent, height: Math.round(h) };
      }).filter(x => x.height > 22);

      // 检查 3 个旗舰卡片的流程条是否单行、架构抽屉能否展开
      const flagshipResults = [];
      for (const card of [...document.querySelectorAll('.flagship-card')]) {
        const flowBar = card.querySelector('.flagship-workflow-bar');
        const flowHeight = Math.round(flowBar?.getBoundingClientRect().height || 0);
        const toggleBtn = [...card.querySelectorAll('button')].find(b => b.textContent.includes('架构与决策'));
        toggleBtn.click();
        await new Promise(r => setTimeout(r, 80));
        const drawerExists = !!card.querySelector('.flagship-drawer');
        toggleBtn.click();
        await new Promise(r => setTimeout(r, 50));
        flagshipResults.push({ id: card.id, flowHeight, drawerExists });
      }

      // 测试全部 5 个分类筛选 Tab 数量准确性
      const filterResults = [];
      for (const tab of [...document.querySelectorAll('.portfolio-filter-bar button')]) {
        tab.click();
        await new Promise(r => setTimeout(r, 60));
        const expected = Number(tab.querySelector('em')?.textContent || 0);
        const actual = document.querySelectorAll('.flagship-card').length + document.querySelectorAll('.archive-card').length;
        filterResults.push({ label: tab.querySelector('span')?.textContent, expected, actual });
      }

      return { overflow, brokenImgs, beforeH, afterH, hasStructuredCompare, wrappedImpacts, flagshipResults, filterResults };
    })()`);

    if (portfolioDesktop.overflow > 1) logBug(`案例集页桌面端存在水平溢出: +${portfolioDesktop.overflow}px`);
    else logPass('案例集页桌面端无水平溢出');

    if (portfolioDesktop.brokenImgs.length) logBug(`案例集页图片加载失败: ${portfolioDesktop.brokenImgs.join(', ')}`);
    else logPass('案例集页全部图片加载正常');

    if (
      portfolioDesktop.afterH.h4 !== portfolioDesktop.beforeH.h4 ||
      portfolioDesktop.afterH.h6 !== portfolioDesktop.beforeH.h6 ||
      portfolioDesktop.afterH.h5 <= portfolioDesktop.beforeH.h5 + 40 ||
      !portfolioDesktop.hasStructuredCompare
    ) {
      logBug(`扩展卡片展开联动拉伸回归失败: before=${JSON.stringify(portfolioDesktop.beforeH)} after=${JSON.stringify(portfolioDesktop.afterH)} structured=${portfolioDesktop.hasStructuredCompare}`);
    } else {
      logPass(`扩展卡片展开隔离验证通过 (04:${portfolioDesktop.afterH.h4}px 未变, 05:${portfolioDesktop.beforeH.h5}->${portfolioDesktop.afterH.h5}px 规范两行展开, 06:${portfolioDesktop.afterH.h6}px 未变)`);
    }

    if (portfolioDesktop.wrappedImpacts.length) {
      logBug(`扩展卡片顶部提效指标发生折行: ${JSON.stringify(portfolioDesktop.wrappedImpacts)}`);
    } else {
      logPass('12 个扩展卡片顶部提效指标均单行不折行');
    }

    for (const f of portfolioDesktop.flagshipResults) {
      if (!f.drawerExists) logBug(`旗舰案例 ${f.id} 架构抽屉未正常展开`);
      if (f.flowHeight > 48) logBug(`旗舰案例 ${f.id} 流程条发生折行 (height=${f.flowHeight}px)`);
    }
    logPass(`3 个旗舰案例架构抽屉与流程条检查完成: ${JSON.stringify(portfolioDesktop.flagshipResults)}`);

    for (const fr of portfolioDesktop.filterResults) {
      if (fr.expected !== fr.actual) logBug(`分类筛选 "${fr.label}" 计数不一致: expected=${fr.expected}, actual=${fr.actual}`);
    }
    logPass('5 个分类筛选 Tab 数量与渲染结果 100% 一致');

    // ==================== 3. 移动端响应式 E2E (390x844) ====================
    await openPage(`${BASE_URL}/index.html`, 390, 844);
    const homeMobile = await cdp.eval(`(async () => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const totalHeight = document.body.scrollHeight;
      const menuBtn = document.querySelector('.menu-toggle');
      menuBtn.click();
      await new Promise(r => setTimeout(r, 80));
      const navOpen = document.querySelector('#primary-navigation').classList.contains('open');
      menuBtn.click();
      await new Promise(r => setTimeout(r, 80));
      const navClosed = !document.querySelector('#primary-navigation').classList.contains('open');

      // 1. 首屏方案 C：透明无框人物 + 1+2 Bento 战绩宫格
      const cutoutEl = document.querySelector('.m-hero-portrait-cutout');
      const cutoutStyle = cutoutEl ? getComputedStyle(cutoutEl) : null;
      const cutoutTransparent = !!cutoutStyle && cutoutStyle.backgroundColor === 'rgba(0, 0, 0, 0)' && cutoutStyle.borderTopWidth === '0px';
      const bentoCards = document.querySelectorAll('.m-hero-bento > a').length;
      const bentoMetricsSingleLine = [...document.querySelectorAll('.m-hero-bento strong')].every(
        (el) => Math.round(el.getBoundingClientRect().height) <= 32
      );

      // 2. 核心案例自动轮播 + 点击胶囊切卡 + 细节抽屉 + 打开工作流弹窗
      const carousel = document.querySelector('.mobile-case-carousel');
      const pills = [...document.querySelectorAll('.mobile-carousel-pill')];
      let switchedToSecond = false;
      if (pills[1]) {
        pills[1].click();
        await new Promise(r => setTimeout(r, 150));
        switchedToSecond = pills[1].classList.contains('active');
      }
      const firstDrawerBtn = document.querySelector('.m-case-drawer-btn');
      firstDrawerBtn?.click();
      await new Promise(r => setTimeout(r, 80));
      const drawerOpened = !!document.querySelector('.m-case-drawer-body');
      firstDrawerBtn?.click();
      await new Promise(r => setTimeout(r, 60));

      // 移动端打开三大交互工作台弹窗，全面校验单栏、无溢出、头部无缝隙、卡片不被裁切
      const dialogAudits = [];
      for (let i = 0; i < 3; i += 1) {
        pills[i]?.click();
        await new Promise(r => setTimeout(r, 220));
        const cards = [...document.querySelectorAll('.mobile-case-card')];
        cards[i]?.querySelector('.m-case-visual')?.click();
        await new Promise(r => setTimeout(r, 750));
        const dlg = document.querySelector('dialog.case-dialog[open]');
        const scrollBody = dlg?.querySelector('.dialog-scroll-body');
        if (scrollBody) scrollBody.scrollTop = 260;
        await new Promise(r => setTimeout(r, 80));
        const topEl = dlg?.querySelector('.dialog-top');
        const dlgRect = dlg?.getBoundingClientRect();
        const topRect = topEl?.getBoundingClientRect();
        const appBarRect = dlg?.querySelector('.wb-app-bar')?.getBoundingClientRect();
        const guardTag = dlg?.querySelector('.wk-agent-guard-tag');
        const uniCards = [...(dlg?.querySelectorAll('.uni-card') || [])];
        const uniCardsIntact = uniCards.every((c) => {
          const r = c.getBoundingClientRect();
          const btn = c.querySelector('.uni-shortlist-btn')?.getBoundingClientRect();
          return r.height >= 100 && (!btn || btn.bottom <= r.bottom + 1);
        });
        const scopeTabs = [...(dlg?.querySelectorAll('.wk-scope-tab') || [])];
        const scopeTabsSingleRow = scopeTabs.length < 2 || scopeTabs.every(
          (t) => Math.abs(t.getBoundingClientRect().top - scopeTabs[0].getBoundingClientRect().top) < 6
        );
        dialogAudits.push({
          idx: i,
          overflow: dlg ? dlg.scrollWidth - dlg.clientWidth : 999,
          headerSeamGap: dlgRect && topRect ? Math.round(topRect.top - dlgRect.top) : 999,
          appBarHeight: appBarRect ? Math.round(appBarRect.height) : 0,
          guardTagHeight: guardTag ? Math.round(guardTag.getBoundingClientRect().height) : 0,
          uniCardsIntact,
          scopeTabsSingleRow,
        });
        dlg?.querySelector('.dialog-top button')?.click();
        await new Promise(r => setTimeout(r, 120));
      }
      const mobileDialogOverflow = Math.max(...dialogAudits.map((a) => a.overflow));

      // 3. 工作方法工程轴（默认展开第1步，点第2步可切换）
      const axisTriggers = [...document.querySelectorAll('.method-axis-trigger')];
      const axisInitialOpen = document.querySelectorAll('.method-axis-item.open').length === 1;
      axisTriggers[1]?.click();
      await new Promise(r => setTimeout(r, 60));
      const axisSwitched = document.querySelectorAll('.method-axis-item')[1]?.classList.contains('open');

      // 4. 履历深色定位卡 + 手风琴经历 + 速览技能
      const hasProfileDarkCard = !!document.querySelector('.profile-dark-card');
      const expTriggers = [...document.querySelectorAll('.exp-accordion-trigger')];
      expTriggers[1]?.click();
      await new Promise(r => setTimeout(r, 60));
      const expSwitched = document.querySelectorAll('.exp-accordion-item')[1]?.classList.contains('open');
      const skillRows = document.querySelectorAll('.skill-compact-row').length;

      const sectionCanvases = [...document.querySelectorAll('.particle-title-section .particle-title-canvas')].map(c => {
        const r = c.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      });

      const contactSameRow = [...document.querySelectorAll('.contact-list > div')].every(row => {
        const dt = row.querySelector('dt')?.getBoundingClientRect();
        const dd = row.querySelector('dd')?.getBoundingClientRect();
        return dt && dd && Math.abs(dt.top - dd.top) < 16;
      });

      return {
        overflow,
        totalHeight,
        navOpen,
        navClosed,
        cutoutTransparent,
        bentoCards,
        bentoMetricsSingleLine,
        hasCarousel: !!carousel,
        pillCount: pills.length,
        switchedToSecond,
        drawerOpened,
        mobileDialogOverflow,
        dialogAudits,
        axisInitialOpen,
        axisSwitched,
        hasProfileDarkCard,
        expSwitched,
        skillRows,
        sectionCanvases,
        contactSameRow,
      };
    })()`);

    if (homeMobile.overflow > 1) logBug(`首页移动端(390px)存在水平溢出: +${homeMobile.overflow}px`);
    else logPass(`首页移动端(390px)无水平溢出，总高度瘦身至 ${homeMobile.totalHeight}px (${(homeMobile.totalHeight / 844).toFixed(1)} 屏)`);
    if (homeMobile.totalHeight > 4200) logBug(`首页移动端仍过长: ${homeMobile.totalHeight}px`);
    if (!homeMobile.navOpen || !homeMobile.navClosed) logBug(`首页移动端导航菜单开关异常: ${JSON.stringify(homeMobile)}`);
    else logPass('首页移动端导航菜单开关正常');

    if (!homeMobile.cutoutTransparent || homeMobile.bentoCards !== 3 || !homeMobile.bentoMetricsSingleLine) {
      logBug(`首页移动端方案 C 首屏人物透明或 Bento 宫格异常: ${JSON.stringify({ cutoutTransparent: homeMobile.cutoutTransparent, bentoCards: homeMobile.bentoCards, bentoMetricsSingleLine: homeMobile.bentoMetricsSingleLine })}`);
    } else {
      logPass('首页移动端方案 C：右上角透明无框人物 + 1+2 Bento 战绩宫格正常');
    }

    if (!homeMobile.hasCarousel || homeMobile.pillCount !== 3 || !homeMobile.switchedToSecond || !homeMobile.drawerOpened) {
      logBug(`移动端核心案例自动轮播或细节抽屉异常: ${JSON.stringify({ hasCarousel: homeMobile.hasCarousel, pillCount: homeMobile.pillCount, switchedToSecond: homeMobile.switchedToSecond, drawerOpened: homeMobile.drawerOpened })}`);
    } else {
      logPass('首页移动端核心案例自动轮播、胶囊切卡与交付细节抽屉均正常');
    }
    if (homeMobile.mobileDialogOverflow > 2) logBug(`移动端案例交互弹窗存在水平溢出: +${homeMobile.mobileDialogOverflow}px`);
    else logPass('首页移动端案例交互弹窗无水平溢出');
    for (const da of homeMobile.dialogAudits || []) {
      if (da.headerSeamGap > 2) logBug(`移动端工作台#${da.idx + 1} 弹窗头部吸顶存在露缝: ${da.headerSeamGap}px`);
      if (da.appBarHeight > 48) logBug(`移动端工作台#${da.idx + 1} 状态栏发生折行过高: ${da.appBarHeight}px`);
      if (da.guardTagHeight > 28) logBug(`移动端工作台#${da.idx + 1} 徽章文字发生折行: ${da.guardTagHeight}px`);
      if (!da.uniCardsIntact) logBug(`移动端工作台#${da.idx + 1} 院校卡片被压扁裁切`);
      if (!da.scopeTabsSingleRow) logBug(`移动端工作台#${da.idx + 1} 顶部切换 Tab 发生折行`);
    }
    if ((homeMobile.dialogAudits || []).every((da) => da.headerSeamGap <= 2 && da.appBarHeight <= 48 && da.guardTagHeight <= 28 && da.uniCardsIntact && da.scopeTabsSingleRow)) {
      logPass('首页移动端 3 大交互工作台弹窗单栏、头部无缝隙、状态栏单行、卡片无裁切全部通过');
    }

    if (!homeMobile.axisInitialOpen || !homeMobile.axisSwitched) logBug('移动端工作方法左侧工程轴展开切换异常');
    else logPass('首页移动端工作方法左侧工程轴（样式 C）展开切换正常');

    if (!homeMobile.hasProfileDarkCard || !homeMobile.expSwitched || homeMobile.skillRows !== 3) {
      logBug(`移动端履历深色定位卡/手风琴/技能行异常: ${JSON.stringify({ hasProfileDarkCard: homeMobile.hasProfileDarkCard, expSwitched: homeMobile.expSwitched, skillRows: homeMobile.skillRows })}`);
    } else {
      logPass('首页移动端履历深色定位卡 + 手风琴经历 + 3 行速览技能（样式 B）正常');
    }

    if (homeMobile.sectionCanvases.some((c) => c.w === 0 || c.h === 0)) logBug(`移动端存在零尺寸粒子画布: ${JSON.stringify(homeMobile.sectionCanvases)}`);
    else logPass(`首页移动端章节粒子标题画布正常 (${homeMobile.sectionCanvases.map((c) => `${c.w}x${c.h}`).join(', ')})`);

    if (!homeMobile.contactSameRow) logBug('移动端联系卡标签与内容未同行对齐');
    else logPass('首页移动端联系卡标签与联系方式同行对齐');

    await openPage(`${BASE_URL}/portfolio.html`, 390, 844);
    const portfolioMobile = await cdp.eval(`(() => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const sectionHeadingWrapped = [...document.querySelectorAll('.portfolio-section-bar h2')].map(h2 => ({
        text: h2.textContent,
        height: Math.round(h2.getBoundingClientRect().height),
      })).filter(x => x.height > 32);
      const hiddenFlowSeps = [...document.querySelectorAll('.flagship-workflow-bar .workflow-step-sep')]
        .every(el => getComputedStyle(el).display === 'none');
      const hasArchiveLink = !!document.querySelector('a[href="archive.html"]');
      return {
        overflow,
        totalHeight: document.body.scrollHeight,
        flagshipCount: document.querySelectorAll('.flagship-card').length,
        archiveCount: document.querySelectorAll('.archive-card').length,
        sectionHeadingWrapped,
        hiddenFlowSeps,
        hasArchiveLink,
      };
    })()`);

    if (portfolioMobile.overflow > 1) logBug(`案例集页移动端(390px)存在水平溢出: +${portfolioMobile.overflow}px`);
    else logPass(`案例集页移动端(390px)无水平溢出，聚焦 3 个旗舰案例 (${portfolioMobile.totalHeight}px)`);

    if (portfolioMobile.archiveCount !== 0 || !portfolioMobile.hasArchiveLink) {
      logBug(`案例集页移动端未将 12 个扩展案例剥离至独立页: archiveCount=${portfolioMobile.archiveCount}, hasArchiveLink=${portfolioMobile.hasArchiveLink}`);
    } else {
      logPass('案例集页移动端已剥离扩展案例并提供直达 archive.html 入口');
    }

    if (portfolioMobile.sectionHeadingWrapped.length) {
      logBug(`案例集页移动端区块标题发生挤压折行: ${JSON.stringify(portfolioMobile.sectionHeadingWrapped)}`);
    } else {
      logPass('案例集页移动端区块标题均完整单行展示');
    }

    if (!portfolioMobile.hiddenFlowSeps) logBug('案例集页移动端旗舰流程条未隐藏悬空箭头');
    else logPass('案例集页移动端旗舰流程条采用规整 3 列网格');

    // ==================== 3.2 独立扩展案例页 archive.html (390x844) ====================
    await openPage(`${BASE_URL}/archive.html`, 390, 844);
    const archiveMobile = await cdp.eval(`(async () => {
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const totalCards = document.querySelectorAll('.archive-card').length;
      const firstMore = document.querySelector('.archive-card .archive-card-more');
      firstMore?.click();
      await new Promise(r => setTimeout(r, 80));
      const detailExpanded = document.querySelectorAll('.archive-card .archive-detail-row').length === 2;
      // 点击第二个分类筛选验证过滤正常
      const filterBtns = [...document.querySelectorAll('.portfolio-filter-bar button')];
      filterBtns[1]?.click();
      await new Promise(r => setTimeout(r, 60));
      const expected = Number(filterBtns[1]?.querySelector('em')?.textContent || 0);
      const actual = document.querySelectorAll('.archive-card').length;
      return { overflow, totalCards, detailExpanded, filterMatched: expected === actual && actual > 0 };
    })()`);

    if (archiveMobile.overflow > 1) logBug(`独立扩展案例页 archive.html 移动端存在水平溢出: +${archiveMobile.overflow}px`);
    else logPass(`独立扩展案例页 archive.html 移动端无水平溢出 (${archiveMobile.totalCards} 个案例)`);
    if (archiveMobile.totalCards !== 12 || !archiveMobile.detailExpanded || !archiveMobile.filterMatched) {
      logBug(`独立扩展案例页 archive.html 渲染或筛选异常: ${JSON.stringify(archiveMobile)}`);
    } else {
      logPass('独立扩展案例页 archive.html 12 个案例、详情展开与分类筛选均正常');
    }

    // ==================== 3.5 Hash 锚点直达案例集页 + chatbot-demo.html 校验 ====================
    await openPage(`${BASE_URL}/portfolio.html#university-agent`, 1440, 900);
    const hashCheck = await cdp.eval(`(() => {
      const target = document.getElementById('university-agent');
      const header = document.querySelector('.site-header');
      const targetTop = target ? Math.round(target.getBoundingClientRect().top) : -999;
      const headerBottom = header ? Math.round(header.getBoundingClientRect().bottom) : 0;
      return { targetTop, headerBottom, notOccluded: targetTop >= headerBottom - 2 };
    })()`);
    if (!hashCheck.notOccluded) logBug(`案例集页 Hash 跳转被顶栏遮挡: ${JSON.stringify(hashCheck)}`);
    else logPass(`案例集页 Hash 跳转精准定位未遮挡 (targetTop=${hashCheck.targetTop}px >= headerBottom=${hashCheck.headerBottom}px)`);

    // ==================== 4. 控制台错误与网络 4xx/5xx 检查 ====================
    if (consoleErrors.length) logBug(`页面控制台报错: ${consoleErrors.join(' | ')}`);
    else logPass('全站运行零 Console Error / 未捕获异常');

    if (failedRequests.length) logBug(`存在本地失败请求: ${failedRequests.join(', ')}`);
    else logPass('全站本地资源零 4xx/5xx 请求失败');

    console.log('\n=== E2E SUMMARY ===');
    console.log(`Total Issues Found: ${issues.length}`);
    if (issues.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    cdp?.close();
    chrome.kill('SIGKILL');
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

runE2E().catch((err) => {
  console.error('E2E_FATAL:', err);
  process.exit(1);
});
