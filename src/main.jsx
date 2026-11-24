import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, MotionConfig, useReducedMotion, useScroll, useSpring } from 'motion/react';
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
import './styles.css';

const portfolioPath = 'portfolio.html';
const isProjectPage = window.location.pathname.endsWith(portfolioPath);

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

function Header({ projectPage = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = projectPage
    ? [['首页', 'index.html'], ['旗舰案例', '#flagship-cases'], ['更多案例集', '#archive-cases'], ['联系', '#contact']]
    : [['核心案例', '#projects'], ['案例集', portfolioPath], ['工作方法', '#approach'], ['履历背书', '#experience'], ['联系', '#contact']];

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
            <Play size={13} /> 交互工作流
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
        <CaseExperience project={project} />
      ) : (
        <div className="case-row-grid">
          <div className="case-row-visual">
            <CaseVisual project={project} onOpen={onPreview} />
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
            <div className="case-row-actions">
              <a className="button-primary" href={`${portfolioPath}#${project.id}`}>
                阅读完整案例 <ArrowUpRight size={15} />
              </a>
              <button type="button" className="button-link" onClick={() => setMode('workflow')}>
                直接体验工作流 <ArrowRight size={15} />
              </button>
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

function ProjectsSection() {
  const [previewProject, setPreviewProject] = useState(null);
  return (
    <section className="projects-section" id="projects">
      <div className="page-width">
        <SectionHeading
          label="Core Case Studies"
          title="用具体交付 证明业务优化能力"
          intro="每个案例清晰呈现「原有痛点 → AI 流程重构 → 实际交付与交互验证」，支持直接切换体验核心工作流。"
          aside={<a className="button-link" href={portfolioPath}>全部案例详情页 <ArrowRight size={16} /></a>}
        />

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
              onPreview={() => setPreviewProject(project)}
            />
          ))}
        </div>

        <div className="archive-teaser">
          <div>
            <strong>更多实战与自动化案例（+{archiveCases.length} 个）</strong>
            <p>涵盖 RPA 订单管线、评论洞察看板、竞品监控、企业 AI SOP 与轻量助手矩阵，持续更新。</p>
          </div>
          <a className="button-primary" href={portfolioPath}>
            进入完整案例集 <ArrowRight size={15} />
          </a>
        </div>
        {previewProject && <CaseDialog project={previewProject} onClose={() => setPreviewProject(null)} />}
      </div>
    </section>
  );
}

const methodItems = [
  ['01', '先看现场卡在哪', '先摸清人工耗时、数据来源和不能交给 AI 乱答的边界，不为加 AI 而加。', '例：医疗客服先切分常规咨询与高风险诊疗，再定转人工界线。'],
  ['02', '接进现有工具', '围绕已有 API、表格和文档建好数据表，让流程直接跑在团队日常工具里。', '例：周报平台直连企微，拆出员工、部门、原文、事项 4 张表。'],
  ['03', '规则和模型分工', '硬条件交给代码规则，模糊语义交给大模型，拿不准的一律进待确认。', '例：选校先用规则筛硬门槛，开放专业表述再交人工看成绩单。'],
  ['04', '留痕可追溯、能回归', '每条结果保留来源与状态，用真实样本跑自动化回归，确保长期稳定。', '例：高校选校全链路通过 37 项自动化回归与脏数据拦截。'],
];

function ApproachSection() {
  return (
    <section className="approach-section" id="approach">
      <div className="page-width">
        <SectionHeading
          label="Methodology"
          title="从现场问题 到可复核的系统交付"
          intro="每次 AI 落地都遵循同一条原则：先把确定性框死，再释放模型能力。"
        />
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
      </div>
    </section>
  );
}

const skills = [
  ['AI 应用工程', 'LLM API · RAG / 知识库 · Structured Output · Prompt Engineering · Agent / Skill 设计 · 规则约束与回归评测'],
  ['后端与数据', 'Python · FastAPI · Node.js · PostgreSQL · MySQL · Redis · 企业微信 API'],
  ['前端与交付', 'React · Next.js · TypeScript · Docker · Nginx · Git'],
];

function ExperienceSection() {
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

function FlagshipCaseCard({ project, onOpenDemo }) {
  const demo = caseDemos[project.id];
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="flagship-card" id={project.id}>
      <div className="flagship-card-grid">
        <div className="flagship-visual">
          <CaseVisual project={project} onOpen={onOpenDemo} />
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
              <p>{project.before}</p>
            </div>
            <div className="flagship-compare-row">
              <span className="flagship-compare-tag after">现在</span>
              <p>{project.after}</p>
            </div>
          </div>

          <div className="flagship-footer">
            <div className="stack-chips">
              {project.stack.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="flagship-actions">
              <button type="button" className="button-primary btn-compact" onClick={onOpenDemo}>
                <Play size={13} /> 交互工作流
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
  const [category, setCategory] = useState('all');
  const [activeDialogProject, setActiveDialogProject] = useState(null);

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

  const totalCount = projects.length + archiveCases.length;

  return (
    <>
      <Header projectPage />
      <main className="portfolio-main">
        <section className="portfolio-hero-compact" id="home">
          <div className="page-width portfolio-hero-row">
            <div>
              <a className="back-link-compact" href="index.html"><ArrowLeft size={14} /> 返回首页</a>
              <ParticleTitle as="h1" variant="section" text="项目案例集" />
              <p className="portfolio-sub">
                3 个旗舰深度交付案例 + {archiveCases.length} 个轻量业务与自动化案例，按业务场景持续扩充。
              </p>
            </div>
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
                  onOpenDemo={() => setActiveDialogProject(project)}
                />
              ))}
            </div>
          </section>
        )}

        {filteredArchives.length > 0 && (
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
        )}

        {activeDialogProject && (
          <CaseDialog project={activeDialogProject} onClose={() => setActiveDialogProject(null)} />
        )}
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
    <div className={isProjectPage ? 'app project-app' : 'app'}>
      <div className="screen-site">
        <ReadingProgress />
        {isProjectPage ? <PortfolioPage /> : <HomePage />}
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
