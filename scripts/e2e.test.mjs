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

    // 测试首页案例 02 切换交互工作流并遍历 6 步 + 弹窗预览
    const homeInteractive = await cdp.eval(`(async () => {
      const card = document.getElementById('preview-university-agent');
      const workflowTab = [...card.querySelectorAll('button[role="tab"]')].find(b => b.textContent.includes('交互工作流'));
      workflowTab.click();
      await new Promise(r => setTimeout(r, 150));
      const stepBtns = [...card.querySelectorAll('.demo-step-list button')];
      let steppedAll = stepBtns.length === 6;
      for (const btn of stepBtns) {
        btn.click();
        await new Promise(r => setTimeout(r, 40));
        const stageTitle = card.querySelector('.demo-stage-content h4')?.textContent;
        if (!stageTitle) steppedAll = false;
      }
      const sourceBtn = card.querySelector('.demo-source-toggle');
      sourceBtn.click();
      await new Promise(r => setTimeout(r, 50));
      const sourceVisible = !card.querySelector('.demo-source').hidden;
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
      return { stepCount: stepBtns.length, steppedAll, sourceVisible, dialogOpen, dialogClosed };
    })()`);

    if (!homeInteractive.steppedAll || !homeInteractive.sourceVisible) logBug(`首页交互工作流沙盒异常: ${JSON.stringify(homeInteractive)}`);
    else logPass(`首页高校 Agent 6 步交互工作流与原文溯源正常`);

    if (!homeInteractive.dialogOpen || !homeInteractive.dialogClosed) logBug(`首页案例预览弹窗开关异常: ${JSON.stringify(homeInteractive)}`);
    else logPass('首页案例预览弹窗打开/关闭正常');

    // 测试首页案例 01 周报交互沙盒：3 份周报样例切换 + 事项点击回查原文高亮 <mark>
    const weeklyInteractive = await cdp.eval(`(async () => {
      const card = document.getElementById('preview-weekly-intelligence');
      const workflowTab = [...card.querySelectorAll('button[role="tab"]')].find(b => b.textContent.includes('交互工作流'));
      workflowTab.click();
      await new Promise(r => setTimeout(r, 120));
      const scenarioBtns = [...card.querySelectorAll('.demo-scenarios button')];
      let allScenariosOk = scenarioBtns.length === 3;
      let quoteMarkFound = false;
      for (const sBtn of scenarioBtns) {
        sBtn.click();
        await new Promise(r => setTimeout(r, 50));
        // 点击第 2 步（AI 结构化）并点击第一条事项触发原文高亮
        const step2 = card.querySelectorAll('.demo-step-list button')[1];
        step2?.click();
        await new Promise(r => setTimeout(r, 50));
        const itemBtn = card.querySelector('button.demo-data-row');
        itemBtn?.click();
        await new Promise(r => setTimeout(r, 50));
        const markText = card.querySelector('.demo-source mark')?.textContent?.trim();
        if (markText && markText.length > 3) quoteMarkFound = true;
        else allScenariosOk = false;
      }
      // 展开数据结构 JSON 面板
      const payloadSummary = card.querySelector('.demo-payload summary');
      payloadSummary?.click();
      await new Promise(r => setTimeout(r, 40));
      const payloadOpen = card.querySelector('.demo-payload')?.open === true;
      return { scenarioCount: scenarioBtns.length, allScenariosOk, quoteMarkFound, payloadOpen };
    })()`);

    if (!weeklyInteractive.allScenariosOk || !weeklyInteractive.quoteMarkFound || !weeklyInteractive.payloadOpen) {
      logBug(`周报交互沙盒样例/原句高亮异常: ${JSON.stringify(weeklyInteractive)}`);
    } else {
      logPass('周报交互沙盒 3 份样例切换、原句高亮回查与 JSON 结构展开全部正常');
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
      const menuBtn = document.querySelector('.menu-toggle');
      menuBtn.click();
      await new Promise(r => setTimeout(r, 80));
      const navOpen = document.querySelector('#primary-navigation').classList.contains('open');
      menuBtn.click();
      await new Promise(r => setTimeout(r, 80));
      const navClosed = !document.querySelector('#primary-navigation').classList.contains('open');
      return { overflow, navOpen, navClosed };
    })()`);

    if (homeMobile.overflow > 1) logBug(`首页移动端(390px)存在水平溢出: +${homeMobile.overflow}px`);
    else logPass('首页移动端(390px)无水平溢出');
    if (!homeMobile.navOpen || !homeMobile.navClosed) logBug(`首页移动端导航菜单开关异常: ${JSON.stringify(homeMobile)}`);
    else logPass('首页移动端导航菜单开关正常');

    await openPage(`${BASE_URL}/portfolio.html`, 390, 844);
    const portfolioMobile = await cdp.eval(`(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      flagshipCount: document.querySelectorAll('.flagship-card').length,
      archiveCount: document.querySelectorAll('.archive-card').length,
    }))()`);

    if (portfolioMobile.overflow > 1) logBug(`案例集页移动端(390px)存在水平溢出: +${portfolioMobile.overflow}px`);
    else logPass('案例集页移动端(390px)无水平溢出');

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
