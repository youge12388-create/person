import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, MotionConfig, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Layers,
  Menu,
  Pause,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import { archiveCases, caseCategories, contact, experience, profileSummary, projects } from './content.js';
import { caseDemos } from './caseDemos.js';
import { CaseDialog, CaseExperience, CaseVisual } from './components/CaseShowcase.jsx';
import { ResumeDocument } from './components/ResumeDocument.jsx';
import { ChatbotDemo } from './components/ChatbotDemo.jsx';
import { ParticleTitle } from './components/ParticleTitle.jsx';
import { initParticleNavigationBridge } from './components/particleTransition.js';
import './styles.css';

initParticleNavigationBridge();

const portfolioPath = 'portfolio.html';
const archivePath = 'archive.html';
const isProjectPage = window.location.pathname.endsWith(portfolioPath);
const isArchivePage = window.location.pathname.endsWith(archivePath);

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 820px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)');
    const onChange = (event) => setIsMobile(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

function ResponsiveDetails({ label, className = '', children }) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 681px)').matches);
  const detailsRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 681px)');
    const revealAnchor = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target && detailsRef.current?.contains(target)) setOpen(true);
    };
    const adapt = () => { setOpen(media.matches); revealAnchor(); };
    media.addEventListener('change', adapt);
    window.addEventListener('hashchange', revealAnchor);
    revealAnchor();
    return () => {
      media.removeEventListener('change', adapt);
      window.removeEventListener('hashchange', revealAnchor);
    };
  }, []);

  return (
    <details ref={detailsRef} className={`responsive-details ${className}`} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{label}<ChevronDown size={16} aria-hidden="true" /></summary>
      <div className="responsive-details-content">{children}</div>
    </details>
  );
}

function PrintButton({ className = 'print-button' }) {
  return (
    <button type="button" className={className} title="打开打印窗口，选择保存为 PDF" onClick={() => window.print()}>
      <Download size={14} aria-hidden="true" />
      <span>导出简历 PDF</span>
    </button>
  );
}

function BrandLogo() {
  return (
    <svg className="brand-mark-svg" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="nav-logo-bg" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#133898" />
          <stop offset="55%" stopColor="#1e56d8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="nav-logo-accent" x1="14" y1="8" x2="26" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#nav-logo-bg)" />
      <path d="M8.5 10.5H13.5L17.5 16L13.5 21.5H8.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 16H24" stroke="url(#nav-logo-accent)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="8.5" cy="10.5" r="2" fill="#7dd3fc" />
      <circle cx="8.5" cy="21.5" r="2" fill="#ffffff" />
      <rect x="21.4" y="13.4" width="5.2" height="5.2" rx="1.2" transform="rotate(45 24 16)" fill="#ffffff" />
    </svg>
  );
}

function Header({ projectPage = false, archivePage = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = archivePage
    ? [['首页', 'index.html'], ['旗舰案例', portfolioPath], ['联系', '#contact']]
    : projectPage
      ? [['首页', 'index.html'], ['旗舰案例', '#flagship-cases'], ['更多实战案例', archivePath], ['联系', '#contact']]
      : [['核心案例', '#projects'], ['旗舰详情', portfolioPath], ['实战案例库', archivePath], ['工作方法', '#approach'], ['履历背书', '#experience'], ['联系', '#contact']];

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="index.html" aria-label="游丰奕，返回首页">
          <BrandLogo />
          <span className="brand-name">游丰奕</span>
          <span className="brand-role">FDE 工程师 · AI 应用交付</span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? '关闭导航' : '打开导航'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav id="primary-navigation" className={`primary-nav${menuOpen ? ' open' : ''}`} aria-label="主导航">
          {nav.map(([label, href]) => (
            <a href={href} key={label} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <PrintButton />
        </nav>
      </div>
    </header>
  );
}

const heroFacts = [
  {
    id: 'weekly-intelligence',
    value: '几小时 → 几分钟',
    title: '40 人周报分析',
    desc: '自动同步企业微信周报并拆成具体工作项，点开部门员工直达原文核对',
  },
  {
    id: 'university-agent',
    value: '3 所/周 → 10+ 所/天',
    title: '200+ 高校简章采集',
    desc: '自研 Skill 挂后台自动搜官网解析 PDF 写表入库，省掉外包',
  },
  {
    id: 'medical-concierge',
    value: '170 条双语 FAQ',
    title: '7×24 医疗客服',
    desc: '跨时区常规咨询自动回复并顺手留资，病情和报价直接转人工',
  },
];

function Hero() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <section className="hero m-hero" id="home">
        <div className="page-width m-hero-inner">
          <div className="m-hero-top">
            <div className="m-hero-head">
              <div className="m-hero-status">
                <i aria-hidden="true" />
                <span>FDE · AI 应用交付</span>
              </div>
              <ParticleTitle
                as="h1"
                variant="heroMobile"
                className="m-hero-title-particle"
                lines={['把 AI 接入业务', '把方案交付成系统']}
              />
            </div>
            <figure className="m-hero-portrait-cutout">
              <img
                src="./image/portrait-640.webp"
                srcSet="./image/portrait-640.webp 640w, ./image/portrait-1200.webp 1200w"
                sizes="184px"
                width="1200"
                height="900"
                fetchPriority="high"
                alt="游丰奕"
              />
            </figure>
          </div>

          <p className="m-hero-intro">
            面向真实业务现场，把数据、模型与规则接成可追溯、可复核的 AI 工作流。
          </p>

          <div className="m-hero-actions">
            <a className="button-primary" href="#projects">查看核心案例 <ArrowDown size={15} /></a>
            <a className="button-secondary" href="#contact">联系交流 <ArrowRight size={15} /></a>
          </div>

          <div className="m-hero-bento" aria-label="核心交付背书">
            <a className="m-bento-main" href="#preview-university-agent">
              <div className="m-bento-top">
                <span className="m-bento-kicker">200+ 高校简章采集 Agent</span>
                <ArrowUpRight size={15} className="m-bento-arrow" aria-hidden="true" />
              </div>
              <strong>3 所/周 → 10+ 所/天</strong>
              <p>自研后台 Skill 自动抓官网、解 PDF 入库，直接替代外包</p>
            </a>

            <a className="m-bento-sub" href="#preview-weekly-intelligence">
              <div className="m-bento-top">
                <span className="m-bento-label">40 人周报分析</span>
                <ArrowUpRight size={14} className="m-bento-arrow" aria-hidden="true" />
              </div>
              <strong>几小时 <em>→</em> 几分钟</strong>
              <p>企微自动拆成工作项，直达原文核对</p>
            </a>

            <a className="m-bento-sub" href="#preview-medical-concierge">
              <div className="m-bento-top">
                <span className="m-bento-label">7×24 医疗客服</span>
                <ArrowUpRight size={14} className="m-bento-arrow" aria-hidden="true" />
              </div>
              <strong>170 条 <em>双语 FAQ</em></strong>
              <p>跨时区自动留资，高风险直接转人工</p>
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero" id="home">
      <div className="hero-inner page-width">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" aria-hidden="true" />
            <span>游丰奕 · FDE 工程师 / AI 应用交付</span>
          </div>
          <ParticleTitle as="h1" variant="hero" lines={['把 AI 接入业务', '把方案交付成系统']} />
          <p className="hero-intro">
            面向真实业务现场拆解低效流程，把数据、模型、规则与现有系统接成一条可运行的 AI 工作流，让每一个业务结果都可追溯、可复核、可落地。
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#projects">查看核心案例 <ArrowDown size={15} /></a>
            <a className="button-secondary" href="#contact">联系交流 <ArrowRight size={15} /></a>
          </div>
        </div>
        <figure className="hero-portrait">
          <img
            src="./image/portrait-1200.webp"
            srcSet="./image/portrait-640.webp 640w, ./image/portrait-1200.webp 1200w"
            sizes="(max-width: 680px) 90vw, 520px"
            width="1200"
            height="900"
            fetchPriority="high"
            alt="游丰奕"
          />
        </figure>
      </div>
      <div className="hero-facts-band">
        <ul className="hero-facts page-width" aria-label="核心交付背书">
          {heroFacts.map((fact) => (
            <li key={fact.id}>
              <a className="fact-card-link" href={`#preview-${fact.id}`}>
                <div className="fact-top">
                  <div className="fact-top-left">
                    <strong>{fact.value}</strong>
                    <em>{fact.title}</em>
                  </div>
                  <ArrowUpRight size={16} className="fact-arrow" aria-hidden="true" />
                </div>
                <span>{fact.desc}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProjectRow({ project, onPreview }) {
  const demo = caseDemos[project.id];
  const reduced = useReducedMotion();
  const [mode, setMode] = useState('overview');
  const [activePreset, setActivePreset] = useState(null);

  const launchPreset = (presetKey) => {
    setActivePreset({ key: presetKey, nonce: Date.now() });
    setMode('workflow');
  };

  return (
    <motion.article
      className="case-row"
      id={`preview-${project.id}`}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="case-row-head">
        <div className="case-row-head-main">
          <span className="case-row-number">{project.number}</span>
          <div>
            <p className="case-row-meta">{project.scope}</p>
            <h3>{project.title}</h3>
          </div>
        </div>
        <div className="case-view-tabs" role="tablist" aria-label={`${project.title}展示切换`}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'overview'}
            className={`case-view-tab${mode === 'overview' ? ' active' : ''}`}
            onClick={() => setMode('overview')}
          >
            <Layers size={14} /> 交付概览
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'workflow'}
            className={`case-view-tab${mode === 'workflow' ? ' active' : ''}`}
            onClick={() => setMode('workflow')}
          >
            <Play size={13} /> 交互工作台
          </button>
        </div>
      </header>

      {/* 之前 / 现在极简对比 */}
      <div className="workflow-compare" aria-label="优化前后对比">
        <div className="workflow-compare-col before">
          <span className="workflow-compare-label">之前</span>
          <p className="workflow-compare-text">{project.before}</p>
        </div>
        <div className="workflow-compare-arrow" aria-hidden="true">
          <ArrowRight size={18} />
        </div>
        <div className="workflow-compare-col after">
          <span className="workflow-compare-label">现在</span>
          <p className="workflow-compare-text">{project.after}</p>
          <div className="workflow-steps-inline">
            {project.workflow.map((stepName, index) => (
              <React.Fragment key={stepName}>
                <span className="workflow-step-chip">{stepName}</span>
                {index < project.workflow.length - 1 && (
                  <span className="workflow-step-sep" aria-hidden="true">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {mode === 'workflow' ? (
        <CaseExperience project={project} activePreset={activePreset} />
      ) : (
        <div className="case-row-grid">
          <div className="case-row-visual">
            <CaseVisual project={project} onOpen={() => onPreview(project, null)} />
          </div>
          <div className="case-row-detail">
            <ul className="case-row-deliverables">
              {project.deliverables.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <dl className="case-row-facts">
              <div><dt>我的职责</dt><dd>{project.role}</dd></div>
              <div>
                <dt>技术栈</dt>
                <dd className="stack-chips">
                  {project.stack.map((tag) => <span key={tag}>{tag}</span>)}
                </dd>
              </div>
            </dl>
            {demo.quickTryPresets && (
              <div className="quick-try-bar" aria-label="一键实操试玩">
                <span className="quick-try-label">直接试玩沙盒：</span>
                <div className="quick-try-pills">
                  {demo.quickTryPresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className="quick-try-pill"
                      onClick={() => launchPreset(preset.key)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="case-row-actions">
              <button type="button" className="button-primary" onClick={() => setMode('workflow')}>
                <Play size={14} /> 打开交互工作台
              </button>
              <a className="button-link" href={`${portfolioPath}#${project.id}`}>
                阅读完整案例 <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  );
}

function SectionHeading({ label, title, intro, aside }) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-label">{label}</p>
        <ParticleTitle as="h2" variant="section" text={title} />
        {intro && <p className="section-intro">{intro}</p>}
      </div>
      {aside}
    </div>
  );
}

const mobileShortTitles = {
  'weekly-intelligence': '周报分析',
  'university-agent': '高校 Agent',
  'medical-concierge': '医疗客服',
};

function MobileCaseCarousel({ onPreview }) {
  const reduced = useReducedMotion();
  const trackRef = useRef(null);
  const pauseTimerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(() => !reduced);
  const [userPaused, setUserPaused] = useState(false);
  const [expandedDetailId, setExpandedDetailId] = useState(null);

  const scrollToIndex = (index, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index];
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
    setActiveIndex(index);
  };

  const pauseTemporarily = (ms = 8000) => {
    setAutoPlay(false);
    clearTimeout(pauseTimerRef.current);
    if (!userPaused && !reduced) {
      pauseTimerRef.current = setTimeout(() => setAutoPlay(true), ms);
    }
  };

  useEffect(() => {
    if (!autoPlay || userPaused || reduced || expandedDetailId) return undefined;
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % projects.length;
        const track = trackRef.current;
        const card = track?.children[next];
        if (track && card) {
          track.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
        }
        return next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [autoPlay, userPaused, reduced, expandedDetailId]);

  useEffect(() => () => clearTimeout(pauseTimerRef.current), []);

  // 监听首屏背书条锚点（#preview-xxx）点击，联动切到对应卡片
  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace('#preview-', '');
      const idx = projects.findIndex((p) => p.id === hash);
      if (idx >= 0) {
        pauseTemporarily(10000);
        scrollToIndex(idx, true);
      }
    };
    window.addEventListener('hashchange', syncHash);
    syncHash();
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth * 0.45;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < track.children.length; i += 1) {
      const child = track.children[i];
      const dist = Math.abs(child.offsetLeft + child.offsetWidth * 0.5 - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    if (closest !== activeIndex) setActiveIndex(closest);
  };

  return (
    <div className="mobile-case-carousel" aria-label="核心案例自动轮播">
      <div className="mobile-carousel-tabs" role="tablist" aria-label="切换核心案例">
        {projects.map((project, index) => (
          <button
            key={project.id}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            className={`mobile-carousel-pill${activeIndex === index ? ' active' : ''}`}
            onClick={() => {
              pauseTemporarily(10000);
              scrollToIndex(index, true);
            }}
          >
            <b>{project.number}</b>
            <span>{mobileShortTitles[project.id] ?? project.title}</span>
          </button>
        ))}
      </div>

      <div
        ref={trackRef}
        className="mobile-carousel-track"
        onScroll={handleScroll}
        onTouchStart={() => pauseTemporarily(9000)}
        onPointerDown={() => pauseTemporarily(9000)}
      >
        {projects.map((project) => {
          const demo = caseDemos[project.id];
          const isExpanded = expandedDetailId === project.id;
          return (
            <article className="mobile-case-card" key={project.id} id={`preview-${project.id}`}>
              <header className="m-case-head">
                <span className="m-case-num">{project.number}</span>
                <div className="m-case-head-text">
                  <p className="m-case-scope">{project.scope}</p>
                  <h3>{project.title}</h3>
                </div>
              </header>

              <button
                type="button"
                className="m-case-visual"
                aria-label={`体验${project.title}交互工作台`}
                onClick={() => {
                  pauseTemporarily(15000);
                  onPreview(project, null);
                }}
              >
                <img src={demo.image} alt={demo.imageAlt} loading="lazy" width="1536" height="1024" />
                <span className="m-case-visual-badge"><Play size={12} /> 实操交互沙盒</span>
              </button>

              <div className="m-case-compare">
                <div className="m-case-compare-row">
                  <span className="m-compare-tag before">之前</span>
                  <p>{project.beforeShort ?? project.before}</p>
                </div>
                <div className="m-case-compare-row after">
                  <span className="m-compare-tag after">现在</span>
                  <p>{project.afterShort ?? project.after}</p>
                </div>
              </div>

              <button
                type="button"
                className="m-case-drawer-btn"
                aria-expanded={isExpanded}
                onClick={() => {
                  pauseTemporarily(15000);
                  setExpandedDetailId(isExpanded ? null : project.id);
                }}
              >
                <span>查看 {project.deliverables.length} 项交付明细与技术栈</span>
                <em>{isExpanded ? '收起 −' : '展开 +'}</em>
              </button>

              {isExpanded && (
                <div className="m-case-drawer-body">
                  <ul className="m-case-deliverables">
                    {project.deliverables.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <div className="m-case-stack">
                    {project.stack.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
              )}

              <div className="m-case-actions">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    pauseTemporarily(15000);
                    onPreview(project, null);
                  }}
                >
                  <Play size={13} /> 交互工作台
                </button>
                <a className="button-secondary" href={`${portfolioPath}#${project.id}`}>
                  完整案例 <ArrowUpRight size={14} />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mobile-carousel-footer">
        <button
          type="button"
          className="mobile-autoplay-toggle"
          onClick={() => {
            const nextPaused = !userPaused;
            setUserPaused(nextPaused);
            setAutoPlay(!nextPaused);
          }}
        >
          {userPaused || !autoPlay ? <Play size={12} /> : <Pause size={12} />}
          <span>{userPaused ? '已暂停 · 点击继续轮播' : `左右滑动或自动轮播 (${activeIndex + 1}/${projects.length})`}</span>
        </button>
        <div className="mobile-carousel-dots" aria-hidden="true">
          {projects.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              tabIndex={-1}
              className={idx === activeIndex ? 'on' : ''}
              onClick={() => {
                pauseTemporarily(10000);
                scrollToIndex(idx, true);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectsSection() {
  const [previewState, setPreviewState] = useState(null);
  const isMobile = useIsMobile();

  const openPreview = (project, presetKey = null) => {
    setPreviewState({
      project,
      preset: presetKey ? { key: presetKey, nonce: Date.now() } : null,
    });
  };

  return (
    <section className="projects-section" id="projects">
      <div className="page-width">
        <SectionHeading
          label="Core Case Studies"
          title="用具体交付 证明业务优化能力"
          intro={isMobile
            ? '滑动切换 3 个旗舰案例，点击图片体验交互工作台。'
            : '每个案例提供真实的交互工作台沙盒：可直接改写周报、调参选校或对话测试医疗护栏。'}
          aside={<a className="button-link" href={portfolioPath}>全部案例详情页 <ArrowRight size={16} /></a>}
        />

        {isMobile ? (
          <MobileCaseCarousel onPreview={(project, presetKey) => openPreview(project, presetKey)} />
        ) : (
          <>
            <nav className="case-quick-nav" aria-label="快速定位案例">
              {projects.map((project) => (
                <a key={project.id} className="case-quick-pill" href={`#preview-${project.id}`}>
                  <span className="case-quick-pill-left">
                    <span className="case-quick-num">{project.number}</span>
                    <span className="case-quick-title">{project.title}</span>
                  </span>
                  <ArrowDown size={14} color="var(--muted)" aria-hidden="true" />
                </a>
              ))}
            </nav>

            <div className="case-list">
              {projects.map((project) => (
                <ProjectRow
                  project={project}
                  key={project.id}
                  onPreview={openPreview}
                />
              ))}
            </div>
          </>
        )}

        <div className="archive-teaser">
          <div>
            <strong>{isMobile ? `更多实战案例（+${archiveCases.length}）` : `更多实战与自动化案例（+${archiveCases.length} 个独立页）`}</strong>
            <p>{isMobile ? '含 RPA 订单、评论看板、竞品监控与企业 AI SOP 等。' : '涵盖 RPA 订单管线、评论洞察看板、竞品监控、企业 AI SOP 与轻量助手矩阵，独立成页清爽浏览。'}</p>
          </div>
          <a className="button-primary" href={archivePath}>
            进入实战案例库 <ArrowRight size={15} />
          </a>
        </div>
        {previewState && (
          <CaseDialog
            project={previewState.project}
            activePreset={previewState.preset}
            onClose={() => setPreviewState(null)}
          />
        )}
      </div>
    </section>
  );
}

const methodItems = [
  ['01', '先看现场卡在哪', '先摸清人工耗时、数据来源和不能交给 AI 乱答的边界，不为加 AI 而加。', '例：医疗客服先切分常规咨询与高风险诊疗，再定转人工界线。', '摸清耗时与不能乱答的边界'],
  ['02', '接进现有工具', '围绕已有 API、表格和文档建好数据表，让流程直接跑在团队日常工具里。', '例：周报平台直连企微，拆出员工、部门、原文、事项 4 张表。', '跑在日常 API 与表格里'],
  ['03', '规则和模型分工', '硬条件交给代码规则，模糊语义交给大模型，拿不准的一律进待确认。', '例：选校先用规则筛硬门槛，开放专业表述再交人工看成绩单。', '硬条件归规则，模糊归模型'],
  ['04', '留痕可追溯、能回归', '每条结果保留来源与状态，用真实样本跑自动化回归，确保长期稳定。', '例：高校选校全链路通过 37 项自动化回归与脏数据拦截。', '保留来源并跑样本回归'],
];

function MethodAxisList({ openIndex, setOpenIndex }) {
  const reduced = useReducedMotion();
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const [railMetrics, setRailMetrics] = useState({
    top: 21,
    height: 0,
    thresholds: methodItems.map((_, index) => (index === 0 ? 0.02 : index / (methodItems.length - 1))),
  });
  const [litCount, setLitCount] = useState(reduced ? methodItems.length : 0);

  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ['start 80%', 'end 64%'],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 24,
    mass: 0.35,
  });
  const sparkY = useTransform(smoothProgress, (v) => v * railMetrics.height);
  const sparkOpacity = useTransform(smoothProgress, [0, 0.03, 0.97, 1], [0, 1, 1, 0]);

  useEffect(() => {
    const measure = () => {
      const listEl = listRef.current;
      if (!listEl) return;
      const centers = methodItems.map((_, index) => {
        const itemEl = itemRefs.current[index];
        if (!itemEl) return 0;
        const triggerEl = itemEl.querySelector('.method-axis-trigger');
        const nodeOffset = triggerEl ? triggerEl.offsetHeight / 2 : 21;
        return itemEl.offsetTop + nodeOffset;
      });
      const firstCenter = centers[0] || 21;
      const lastCenter = centers[centers.length - 1] || firstCenter;
      const span = Math.max(1, lastCenter - firstCenter);
      const thresholds = centers.map((center, index) => {
        if (index === 0) return 0.02;
        if (index === centers.length - 1) return 0.96;
        return Math.min(0.95, Math.max(0.05, (center - firstCenter) / span));
      });
      setRailMetrics({ top: firstCenter, height: span, thresholds });
    };

    const rafId = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measure);
    };
  }, [openIndex]);

  useEffect(() => {
    if (reduced) {
      setLitCount(methodItems.length);
      return;
    }
    const current = smoothProgress.get();
    let nextLit = 0;
    for (let i = 0; i < railMetrics.thresholds.length; i += 1) {
      if (current >= railMetrics.thresholds[i]) {
        nextLit = i + 1;
      }
    }
    setLitCount((prev) => (prev === nextLit ? prev : nextLit));
  }, [reduced, railMetrics.thresholds, smoothProgress]);

  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    if (reduced) return;
    let nextLit = 0;
    for (let i = 0; i < railMetrics.thresholds.length; i += 1) {
      if (latest >= railMetrics.thresholds[i]) {
        nextLit = i + 1;
      }
    }
    setLitCount((prev) => (prev === nextLit ? prev : nextLit));
  });

  const activeHeadIndex = litCount > 0 ? litCount - 1 : -1;

  return (
    <ol className="method-axis-list" ref={listRef}>
      <span
        className="method-axis-rail"
        aria-hidden="true"
        style={railMetrics.height > 0 ? { top: `${railMetrics.top}px`, height: `${railMetrics.height}px` } : undefined}
      >
        <motion.span
          className="method-axis-rail-fill"
          style={{
            scaleY: reduced ? 1 : smoothProgress,
          }}
        />
        {!reduced && railMetrics.height > 0 && (
          <motion.span
            className="method-axis-rail-spark"
            style={{
              y: sparkY,
              opacity: sparkOpacity,
            }}
          />
        )}
      </span>
      {methodItems.map(([number, title, desc, example, shortHint], index) => {
        const isOpen = openIndex === index;
        const isLit = reduced || index < litCount;
        const isActiveHead = !reduced && index === activeHeadIndex;
        const itemClass = [
          'method-axis-item',
          isOpen ? 'open' : '',
          isLit ? 'is-lit' : '',
          isActiveHead ? 'is-active-head' : '',
        ].filter(Boolean).join(' ');

        return (
          <li
            className={itemClass}
            key={number}
            ref={(el) => { itemRefs.current[index] = el; }}
          >
            <span className="method-axis-node" aria-hidden="true">
              <span className="method-axis-node-core" />
            </span>
            <button
              type="button"
              className="method-axis-trigger"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
            >
              <span className="method-axis-left">
                <span className="method-number">{number}</span>
                <strong>{title}</strong>
                {!isOpen && <em className="method-axis-hint">· {shortHint}</em>}
              </span>
              <ChevronDown size={15} className="method-axis-chevron" aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="method-axis-body">
                <p>{desc}</p>
                <div className="method-axis-example">{example}</div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ApproachSection() {
  const isMobile = useIsMobile();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="approach-section" id="approach">
      <div className="page-width">
        <SectionHeading
          label="Methodology"
          title="从现场问题 到可复核的系统交付"
          intro="每次 AI 落地都遵循同一条原则：先把确定性框死，再释放模型能力。"
        />
        {isMobile ? (
          <MethodAxisList openIndex={openIndex} setOpenIndex={setOpenIndex} />
        ) : (
          <ol className="method-list">
            {methodItems.map(([number, title, desc, example]) => (
              <li className="method-item" key={number}>
                <span className="method-number">{number}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <p className="method-example">{example}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const skills = [
  ['AI 应用工程', 'LLM API · RAG / 知识库 · Structured Output · Prompt Engineering · Agent / Skill 设计 · 规则约束与回归评测'],
  ['后端与数据', 'Python · FastAPI · Node.js · PostgreSQL · MySQL · Redis · 企业微信 API'],
  ['前端与交付', 'React · Next.js · TypeScript · Docker · Nginx · Git'],
];

const mobileExperienceShorts = [
  '华太西就教育科技',
  '锦囊妙计企业管理',
];

function ExperienceSection() {
  const isMobile = useIsMobile();
  const [openExpIndex, setOpenExpIndex] = useState(0);
  const [expandedSkill, setExpandedSkill] = useState(null);

  if (isMobile) {
    return (
      <section className="experience-section page-width" id="experience">
        <div className="experience-mobile-wrap">
          <p className="section-label">Track Record</p>
          <ParticleTitle as="h2" variant="section" text="履历背书与技术底座" />

          <div className="profile-dark-card">
            <span className="profile-dark-badge">
              <Sparkles size={12} aria-hidden="true" />
              {profileSummary.badge}
            </span>
            <p className="profile-dark-headline">{profileSummary.headline}</p>
            <p className="profile-dark-body">{profileSummary.bodyShort ?? profileSummary.body}</p>
          </div>

          <ol className="exp-accordion-list">
            {experience.map((item, idx) => {
              const isOpen = openExpIndex === idx;
              const compactPeriod = item.period.replace(/20(\d\d)\./g, '20$1.').replace(' — 2026.', '–').replace(' — 2025.', '–');
              return (
                <li className={`exp-accordion-item${isOpen ? ' open' : ''}`} key={item.company}>
                  <button
                    type="button"
                    className="exp-accordion-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenExpIndex(isOpen ? -1 : idx)}
                  >
                    <div className="exp-accordion-main">
                      <h3>{item.title}</h3>
                      <span className="exp-accordion-co">{isOpen ? item.company : mobileExperienceShorts[idx] ?? item.company}</span>
                    </div>
                    <div className="exp-accordion-right">
                      <time>{compactPeriod}</time>
                      <ChevronDown size={15} className="exp-accordion-chevron" aria-hidden="true" />
                    </div>
                  </button>
                  {isOpen && (
                    <ul className="experience-highlights exp-accordion-body">
                      {item.highlights.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>

          <dl className="skill-compact-list">
            {skills.map(([group, items]) => {
              const isExpanded = expandedSkill === group;
              return (
                <div
                  key={group}
                  className={`skill-compact-row${isExpanded ? ' expanded' : ''}`}
                  onClick={() => setExpandedSkill(isExpanded ? null : group)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedSkill(isExpanded ? null : group); } }}
                >
                  <dt>{group}</dt>
                  <dd>{items}</dd>
                  <ChevronDown size={14} className="skill-compact-chevron" aria-hidden="true" />
                </div>
              );
            })}
          </dl>
        </div>
      </section>
    );
  }

  return (
    <section className="experience-section page-width" id="experience">
      <div className="experience-intro">
        <p className="section-label">Track Record</p>
        <ParticleTitle as="h2" variant="section" text="履历背书与技术底座" />

        <div className="experience-summary">
          <span className="experience-summary-badge">
            <Sparkles size={13} aria-hidden="true" />
            {profileSummary.badge}
          </span>
          <p className="experience-summary-headline">{profileSummary.headline}</p>
          <p className="experience-summary-body">{profileSummary.body}</p>
        </div>

        <dl className="skill-list">
          {skills.map(([group, items]) => <div key={group}><dt>{group}</dt><dd>{items}</dd></div>)}
        </dl>
      </div>
      <ol className="experience-list">
        {experience.map((item) => (
          <li className="experience-item" key={item.company}>
            <time>{item.period}</time>
            <div className="experience-body">
              <h3>{item.title}</h3>
              <p className="experience-company">{item.company}</p>
              <ul className="experience-highlights">
                {item.highlights.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CopyButton({ value, label }) {
  const [status, setStatus] = useState('idle');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    timer.current = setTimeout(() => setStatus('idle'), 3500);
  };
  return (
    <span className="copy-action">
      <button type="button" className="copy-button" onClick={copy} aria-label={`复制${label}`}>
        {status === 'copied' ? <Check size={14} /> : <Copy size={14} />}
        <span>{status === 'copied' ? '已复制' : '复制'}</span>
      </button>
      <span className={`copy-feedback${status === 'error' ? ' visible' : ''}`} role="status">
        {status === 'error' ? '未能复制，请手动选择文字复制。' : status === 'copied' ? `${label}已复制` : ''}
      </span>
    </span>
  );
}

function ContactSection() {
  return (
    <section className="contact-section" id="contact">
      <div className="contact-inner page-width">
        <div className="contact-copy">
          <p className="section-label">Contact</p>
          <ParticleTitle as="h2" variant="section" text="一起把 AI 接入真实业务" className="on-dark" />
          <p>欢迎交流 FDE 工程师岗位、AI 应用工程化与企业工作流优化项目。</p>
          <PrintButton className="print-button on-dark" />
        </div>
        <dl className="contact-list">
          <div><dt>邮箱</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a><CopyButton value={contact.email} label="邮箱" /></dd></div>
          <div><dt>微信</dt><dd><span>{contact.wechat}</span><CopyButton value={contact.wechat} label="微信" /></dd></div>
        </dl>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer page-width">
      <span>© 2026 游丰奕 · FDE 工程师 / AI 应用交付</span>
      <a href="#home" className="back-top">回到顶部 <ArrowUpRight size={14} /></a>
    </footer>
  );
}

function HomePage() {
  useEffect(() => { document.title = '游丰奕 — FDE 工程师 / AI 应用交付'; }, []);
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ProjectsSection />
        <ApproachSection />
        <ExperienceSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

const flagshipCategoryMap = {
  'weekly-intelligence': 'enterprise',
  'university-agent': 'agent',
  'medical-concierge': 'service',
};

function FlagshipCaseCard({ project, onOpenDemo, isMobile = false }) {
  const demo = caseDemos[project.id];
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="flagship-card" id={project.id}>
      <div className="flagship-card-grid">
        <div className="flagship-visual">
          <CaseVisual project={project} onOpen={() => onOpenDemo(project, null)} />
        </div>
        <div className="flagship-body">
          <div className="flagship-meta-row">
            <span className="flagship-num">{project.number}</span>
            <span className="flagship-scope">{project.scope}</span>
          </div>
          <h3 className="flagship-title">{project.title}</h3>

          <div className="flagship-workflow-bar">
            {project.workflow.map((stepName, index) => (
              <React.Fragment key={stepName}>
                <span className="workflow-step-chip">{stepName}</span>
                {index < project.workflow.length - 1 && (
                  <span className="workflow-step-sep" aria-hidden="true">→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="flagship-compare">
            <div className="flagship-compare-row">
              <span className="flagship-compare-tag before">之前</span>
              <p>{isMobile ? (project.beforeShort ?? project.before) : project.before}</p>
            </div>
            <div className="flagship-compare-row">
              <span className="flagship-compare-tag after">现在</span>
              <p>{isMobile ? (project.afterShort ?? project.after) : project.after}</p>
            </div>
          </div>

          {demo.quickTryPresets && (
            <div className="quick-try-bar compact" aria-label="一键实操试玩">
              <span className="quick-try-label">试玩沙盒：</span>
              <div className="quick-try-pills">
                {demo.quickTryPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className="quick-try-pill"
                    onClick={() => onOpenDemo(project, preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flagship-footer">
            <div className="stack-chips">
              {project.stack.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="flagship-actions">
              <button type="button" className="button-primary btn-compact" onClick={() => onOpenDemo(project, null)}>
                <Play size={13} /> 交互工作台
              </button>
              <button
                type="button"
                className="button-secondary btn-compact"
                aria-expanded={expanded}
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? '收起架构细节' : '架构与决策'}
                <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="flagship-drawer">
          <div className="flagship-drawer-cols">
            <div>
              <h4 className="case-section-label">业务背景与方案判断</h4>
              <p>{project.situation}</p>
              <p style={{ marginTop: 8 }}>{project.approach}</p>
            </div>
            <div>
              <h4 className="case-section-label">系统分层与职责</h4>
              <dl className="flagship-arch-list">
                {project.architecture.map(([name, desc]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h4 className="case-section-label">关键设计决策与验证</h4>
              <ul className="flagship-decision-list">
                {project.decisions.map(([title, desc]) => (
                  <li key={title}><strong>{title}：</strong>{desc}</li>
                ))}
              </ul>
            </div>
          </div>
          {project.id === 'medical-concierge' && <ChatbotDemo />}
        </div>
      )}
    </article>
  );
}

function ArchiveCaseCard({ item }) {
  const [open, setOpen] = useState(false);
  const match = item.details?.match(/^之前[：:]\s*([\s\S]*?)\s*现在[：:]\s*([\s\S]*)$/);

  return (
    <article className="archive-card" id={item.id}>
      <div className="archive-card-top">
        <span className="archive-card-num">{item.number}</span>
        <span className="archive-card-tag">{item.tag}</span>
        <span className="archive-card-impact">{item.impact}</span>
      </div>
      <h3 className="archive-card-title">{item.title}</h3>
      <p className="archive-card-summary">{item.summary}</p>
      <div className="archive-card-flow">
        {item.workflow.map((stepName, index) => (
          <React.Fragment key={stepName}>
            <span>{stepName}</span>
            {index < item.workflow.length - 1 && <i aria-hidden="true">→</i>}
          </React.Fragment>
        ))}
      </div>
      {open && (
        match ? (
          <div className="archive-card-detail archive-detail-compare">
            <div className="archive-detail-row">
              <span className="archive-detail-tag before">之前</span>
              <p>{match[1]}</p>
            </div>
            <div className="archive-detail-row">
              <span className="archive-detail-tag after">现在</span>
              <p>{match[2]}</p>
            </div>
          </div>
        ) : (
          <p className="archive-card-detail">{item.details}</p>
        )
      )}
      <div className="archive-card-bottom">
        <div className="archive-card-stack">
          {item.stack.map((s) => <span key={s}>{s}</span>)}
        </div>
        <button
          type="button"
          className="archive-card-more"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '收起' : '详情'}
        </button>
      </div>
    </article>
  );
}

function PortfolioPage() {
  const isMobile = useIsMobile();
  const [category, setCategory] = useState('all');
  const [activeDialogState, setActiveDialogState] = useState(null);

  const openDemoDialog = (project, presetKey = null) => {
    setActiveDialogState({
      project,
      preset: presetKey ? { key: presetKey, nonce: Date.now() } : null,
    });
  };

  useEffect(() => {
    document.title = '项目案例集 — 游丰奕';
    if (!window.location.hash) return;
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerHeight - 16, behavior: 'auto' });
    }));
  }, []);

  const filteredFlagships = category === 'all'
    ? projects
    : projects.filter((p) => flagshipCategoryMap[p.id] === category);

  const filteredArchives = category === 'all'
    ? archiveCases
    : archiveCases.filter((item) => item.categoryKey === category);

  const totalCount = isMobile ? projects.length : projects.length + archiveCases.length;

  return (
    <>
      <Header projectPage />
      <main className="portfolio-main">
        <section className="portfolio-hero-compact" id="home">
          <div className="page-width portfolio-hero-row">
            <div>
              <a className="back-link-compact" href="index.html"><ArrowLeft size={14} /> 返回首页</a>
              <ParticleTitle as="h1" variant="section" text={isMobile ? '核心旗舰案例' : '项目案例集'} />
              <p className="portfolio-sub">
                {isMobile
                  ? '3 个旗舰案例的架构与交互演示；更多 12 个实战案例见独立页。'
                  : `3 个旗舰深度交付案例 + ${archiveCases.length} 个轻量业务与自动化案例，按业务场景持续扩充。`}
              </p>
            </div>
            {!isMobile && (
              <div className="portfolio-filter-bar" role="tablist" aria-label="案例分类筛选">
                {caseCategories.map((cat) => {
                  const count = cat.key === 'all'
                    ? totalCount
                    : projects.filter((p) => flagshipCategoryMap[p.id] === cat.key).length
                      + archiveCases.filter((a) => a.categoryKey === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      role="tab"
                      aria-selected={category === cat.key}
                      className={`filter-pill${category === cat.key ? ' active' : ''}`}
                      onClick={() => setCategory(cat.key)}
                    >
                      <span>{cat.label}</span>
                      <em>{count}</em>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {filteredFlagships.length > 0 && (
          <section className="portfolio-section page-width" id="flagship-cases">
            <div className="portfolio-section-bar">
              <span className="section-label" style={{ margin: 0 }}>Flagship Cases</span>
              <h2>核心旗舰案例（{filteredFlagships.length}）</h2>
            </div>
            <div className="flagship-list">
              {filteredFlagships.map((project) => (
                <FlagshipCaseCard
                  key={project.id}
                  project={project}
                  onOpenDemo={openDemoDialog}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </section>
        )}

        {isMobile ? (
          <section className="portfolio-section page-width">
            <div className="archive-teaser" style={{ marginTop: 0 }}>
              <div>
                <strong>更多实战案例（+{archiveCases.length}）</strong>
                <p>含 RPA 订单、评论看板、竞品监控与企业 AI SOP 等。</p>
              </div>
              <a className="button-primary" href={archivePath}>
                进入实战案例库 <ArrowRight size={15} />
              </a>
            </div>
          </section>
        ) : (
          filteredArchives.length > 0 && (
            <section className="portfolio-section portfolio-archive-band" id="archive-cases">
              <div className="page-width">
                <div className="portfolio-section-bar">
                  <span className="section-label" style={{ margin: 0 }}>More Projects & Archive</span>
                  <h2>更多实战与扩展案例（{filteredArchives.length}）</h2>
                </div>
                <div className="archive-grid">
                  {filteredArchives.map((item) => (
                    <ArchiveCaseCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </section>
          )
        )}

        {activeDialogState && (
          <CaseDialog
            project={activeDialogState.project}
            activePreset={activeDialogState.preset}
            onClose={() => setActiveDialogState(null)}
          />
        )}
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

function ArchivePage() {
  const isMobile = useIsMobile();
  const [category, setCategory] = useState('all');

  useEffect(() => {
    document.title = '更多实战与自动化案例 — 游丰奕';
  }, []);

  const filteredArchives = category === 'all'
    ? archiveCases
    : archiveCases.filter((item) => item.categoryKey === category);

  return (
    <>
      <Header archivePage />
      <main className="portfolio-main">
        <section className="portfolio-hero-compact" id="home">
          <div className="page-width portfolio-hero-row">
            <div>
              <div className="archive-nav-links">
                <a className="back-link-compact" href="index.html"><ArrowLeft size={14} /> 返回首页</a>
                <a className="back-link-compact" href={portfolioPath}>查看 3 个旗舰案例 <ArrowUpRight size={14} /></a>
              </div>
              <ParticleTitle as="h1" variant="section" text="更多实战与自动化案例" />
              <p className="portfolio-sub">
                {isMobile
                  ? `${archiveCases.length} 个轻量业务与自动化案例，按场景筛选，点卡片展开详情。`
                  : `共 ${archiveCases.length} 个轻量业务与自动化落地案例，按场景分类筛选，点击每张卡片可展开「之前 / 现在」对比详情。`}
              </p>
            </div>
            <div className="portfolio-filter-bar" role="tablist" aria-label="实战案例分类筛选">
              {caseCategories.map((cat) => {
                const count = cat.key === 'all'
                  ? archiveCases.length
                  : archiveCases.filter((a) => a.categoryKey === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="tab"
                    aria-selected={category === cat.key}
                    className={`filter-pill${category === cat.key ? ' active' : ''}`}
                    onClick={() => setCategory(cat.key)}
                  >
                    <span>{cat.label}</span>
                    <em>{count}</em>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="portfolio-section portfolio-archive-band" id="archive-cases">
          <div className="page-width">
            <div className="portfolio-section-bar">
              <span className="section-label" style={{ margin: 0 }}>Practice Archive</span>
              <h2>实战与自动化案例（{filteredArchives.length}）</h2>
            </div>
            <div className="archive-grid">
              {filteredArchives.map((item) => (
                <ArchiveCaseCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>

        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 150, damping: 30 });
  const reduced = useReducedMotion();
  return <motion.div className="reading-progress" aria-hidden="true" style={{ scaleX: reduced ? scrollYProgress : smooth }} />;
}

function App() {
  return (
    <div className={isProjectPage || isArchivePage ? 'app project-app' : 'app'}>
      <div className="screen-site">
        <ReadingProgress />
        {isArchivePage ? <ArchivePage /> : isProjectPage ? <PortfolioPage /> : <HomePage />}
      </div>
      <ResumeDocument />
    </div>
  );
}

// Vite 热更新入口时复用根节点，避免重复挂载 React 树。
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById('root'));
root.render(<MotionConfig reducedMotion="user"><App /></MotionConfig>);
if (import.meta.hot) {
  import.meta.hot.data.root = root;
  import.meta.hot.accept();
}
