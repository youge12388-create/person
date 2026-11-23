import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, MotionConfig, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, Download, ExternalLink, Menu, Palette, X } from 'lucide-react';
import { contact, experience, projects } from './content.js';
import { caseDemos } from './caseDemos.js';
import { CaseDialog, CaseExperience, CaseVisual } from './components/CaseShowcase.jsx';
import { ResumeDocument } from './components/ResumeDocument.jsx';
import { ChatbotDemo } from './components/ChatbotDemo.jsx';
import { ParticleTitle } from './components/ParticleTitle.jsx';
import './styles.css';

const portfolioPath = 'portfolio.html';
const isProjectPage = window.location.pathname.endsWith(portfolioPath);

const THEMES = [
  { id: 'palantir', label: 'Palantir 钴蓝', hint: '冷白 · 石墨黑 · 工程钴蓝' },
  { id: 'vercel', label: 'Vercel 极简黑白', hint: '纯白 · 曜石黑 · 精密锌灰' },
  { id: 'linear', label: 'Linear 深空碳黑', hint: '碳黑 · 钨钢灰 · 钛白' },
];

function useBenchmarkTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('fde-benchmark-theme') || 'palantir';
    } catch {
      return 'palantir';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('fde-benchmark-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return [theme, setTheme];
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
      <Download size={15} aria-hidden="true" />
      <span>保存简历 PDF</span>
    </button>
  );
}

function ThemeSwitcher({ theme, onChange }) {
  return (
    <div className="theme-switcher" role="group" aria-label="对标大厂配色切换">
      <span className="theme-switcher-label"><Palette size={13} aria-hidden="true" /> 配色</span>
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`theme-chip${theme === item.id ? ' active' : ''}`}
          title={item.hint}
          aria-pressed={theme === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Header({ projectPage = false, theme, onThemeChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = projectPage
    ? [['首页', 'index.html'], ['案例目录', '#case-index'], ['联系', '#contact']]
    : [['项目案例', '#projects'], ['工作方法', '#approach'], ['经历', '#experience'], ['联系', '#contact']];

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="index.html" aria-label="游丰奕，返回首页">
          <span className="brand-name">游丰奕</span>
          <span className="brand-role">FDE 工程师 · AI 应用交付</span>
        </a>
        <button className="menu-toggle" type="button" aria-label={menuOpen ? '关闭导航' : '打开导航'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav id="primary-navigation" className={`primary-nav${menuOpen ? ' open' : ''}`} aria-label="主导航">
          {nav.map(([label, href]) => <a href={href} key={label} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <ThemeSwitcher theme={theme} onChange={onThemeChange} />
          <PrintButton />
        </nav>
      </div>
    </header>
  );
}

const heroFacts = [
  ['约 40 人', '企业微信周报分析', '组织的周报从逐份人工阅读变为可下钻、可回查原文的智能分析系统'],
  ['约 196 所', '高校研究与选校 Agent', '把院校调研与选校从人工经验沉淀为可复用 Skill 与规则/语义双层链路'],
  ['约 170 条', '跨境医疗双语客服', '中英双语 FAQ，基于 Dify + RAG 连接受约束问答、线索收集与人工接管'],
];

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-inner page-width">
        <div className="hero-copy">
          <p className="eyebrow">游丰奕 · FDE 工程师 / AI 应用交付</p>
          <ParticleTitle as="h1" variant="hero" lines={['把 AI 接入业务，', '把方案交付成系统。']} />
          <p className="hero-intro">
            我从业务现场拆问题，把数据、模型、规则和已有系统接成一条可运行的工作流，并让每个结果都能回到来源、交给人复核。
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#projects">看代表项目 <ArrowDown size={16} /></a>
            <a className="button-link" href="#contact">联系我 <ArrowRight size={16} /></a>
          </div>
        </div>
        <figure className="hero-portrait">
          <img src="./image/portrait-1200.webp" srcSet="./image/portrait-640.webp 640w, ./image/portrait-1200.webp 1200w" sizes="(max-width: 680px) 90vw, 620px" width="1200" height="900" fetchPriority="high" alt="游丰奕" />
        </figure>
      </div>
      <div className="hero-facts-band">
        <ul className="hero-facts page-width" aria-label="项目规模">
          {heroFacts.map(([value, title, desc]) => (
            <li key={value}>
              <div className="fact-top">
                <strong>{value}</strong>
                <em>{title}</em>
              </div>
              <span>{desc}</span>
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
  return (
    <motion.article
      className="case-row"
      id={`preview-${project.id}`}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="case-row-head">
        <span className="case-row-number">{project.number}</span>
        <div>
          <p className="case-row-meta">{demo.capability}<span aria-hidden="true">·</span>{project.scope}</p>
          <h3>{project.title}</h3>
          <p className="case-row-summary">{project.summary}</p>
        </div>
      </header>
      <div className="case-row-grid">
        <div className="case-row-visual"><CaseVisual project={project} onOpen={onPreview} /></div>
        <div className="case-row-detail">
          <p className="case-row-takeaway">{demo.takeaway}</p>
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
            <a className="button-primary" href={`${portfolioPath}#${project.id}`}>阅读完整案例 <ArrowUpRight size={16} /></a>
            <button type="button" className="button-link" onClick={onPreview}>交互预览 <ArrowRight size={15} /></button>
          </div>
        </div>
      </div>
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
    <section className="projects-section page-width" id="projects">
      <SectionHeading
        label="代表项目"
        title="用具体交付，回答能力。"
        intro="每个案例都按同样的顺序阅读：业务问题、我的判断、交付内容与验证方式。"
        aside={<a className="button-link" href={portfolioPath}>全部案例详情 <ArrowRight size={16} /></a>}
      />
      <div className="case-list">
        {projects.map((project) => <ProjectRow project={project} key={project.id} onPreview={() => setPreviewProject(project)} />)}
      </div>
      {previewProject && <CaseDialog project={previewProject} onClose={() => setPreviewProject(null)} />}
    </section>
  );
}

const methodItems = [
  ['01', '澄清真实问题', '了解用户、流程、数据来源和人工判断边界，确定这次交付要解决的具体环节。', '需求与边界清单', '医疗客服先区分服务咨询与专业判断，再决定知识库回答和人工接管的边界。'],
  ['02', '接入现有系统', '围绕已有 API、文档和业务数据建模，让 AI 工作流接入实际信息源。', '数据模型与接入链路', '周报平台把员工、部门、原始周报与工作事项拆成四类核心模型。'],
  ['03', '拆分模型与规则', '结构化提取交给模型，确定性约束交给规则；不确定内容进入待确认流程。', '模型约束与规则流程', '选校 Agent 先过滤确定性条件，再对专业背景等要求进行语义判断。'],
  ['04', '验证并交接', '用真实任务场景回归结果，保留来源、状态与人工接管路径，支持后续迭代。', '回归场景与交接说明', '案例保留来源核验、失败重试、待确认状态和人工出口等验证路径。'],
];

function ApproachSection() {
  return (
    <section className="approach-section" id="approach">
      <div className="page-width">
        <SectionHeading label="工作方法" title="从现场问题，推进到可复核的交付。" intro="场景各不相同，但每次交付都从明确问题与数据边界开始，再逐层把方案跑通。" />
        <ol className="method-list">
          {methodItems.map(([number, title, desc, deliverable, example]) => (
            <li className="method-item" key={number}>
              <span className="method-number">{number}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
              <p className="method-deliverable"><span>交付物</span>{deliverable}</p>
              <p className="method-example">{example}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const skills = [
  ['AI 应用', 'LLM API · RAG / 知识库 · Structured Output · Prompt Engineering · Agent / Skill 设计 · 规则约束与评测'],
  ['后端与数据', 'Python · FastAPI · Node.js · PostgreSQL · MySQL · Redis'],
  ['前端与交付', 'React · Next.js · TypeScript · Docker · Nginx · Git'],
];

function ExperienceSection() {
  return (
    <section className="experience-section page-width" id="experience">
      <div className="experience-intro">
        <p className="section-label">经历与技术栈</p>
        <ParticleTitle as="h2" variant="section" text="从业务问题到系统交付" />
        <p className="section-intro">围绕 AI 应用落地，承担需求分析、数据建模、接口集成与系统验收。</p>
        <dl className="skill-list">
          {skills.map(([group, items]) => <div key={group}><dt>{group}</dt><dd>{items}</dd></div>)}
        </dl>
      </div>
      <ol className="experience-list">
        {experience.map((item) => (
          <li className="experience-item" key={item.company}>
            <time>{item.period}</time>
            <div>
              <h3>{item.title}</h3>
              <p className="experience-company">{item.company}</p>
              <p>{item.details}</p>
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
        {status === 'copied' ? <Check size={15} /> : <Copy size={15} />}
        <span>{status === 'copied' ? '已复制' : '复制'}</span>
      </button>
      <span className={`copy-feedback${status === 'error' ? ' visible' : ''}`} role="status">{status === 'error' ? '未能复制，请手动选择文字复制。' : status === 'copied' ? `${label}已复制` : ''}</span>
    </span>
  );
}

function ContactSection() {
  return (
    <section className="contact-section" id="contact">
      <div className="contact-inner page-width">
        <div className="contact-copy">
          <p className="section-label">联系</p>
          <ParticleTitle as="h2" variant="section" text="一起把 AI 接入真实业务。" className="on-dark" />
          <p>欢迎交流 AI 应用工程、FDE 岗位与企业工作流项目。</p>
          <PrintButton className="print-button on-dark" />
        </div>
        <dl className="contact-list">
          <div><dt>邮箱</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a><CopyButton value={contact.email} label="邮箱" /></dd></div>
          <div><dt>微信</dt><dd><span>{contact.wechat}</span><CopyButton value={contact.wechat} label="微信" /></dd></div>
          <div><dt>GitHub</dt><dd><a href={contact.github} target="_blank" rel="noreferrer">{contact.github.replace('https://', '')} <ExternalLink size={14} /></a></dd></div>
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

function HomePage({ theme, onThemeChange }) {
  useEffect(() => { document.title = '游丰奕 — FDE 工程师 / AI 应用交付'; }, []);
  return (
    <>
      <Header theme={theme} onThemeChange={onThemeChange} />
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

function ProjectCase({ project }) {
  const demo = caseDemos[project.id];
  return (
    <article className="case-study" id={project.id}>
      <header className="case-header">
        <p className="case-meta"><span>案例 {project.number}</span>{demo.capability}</p>
        <ParticleTitle as="h2" variant="case" text={project.title} />
        <p className="case-summary">{project.summary}</p>
        <dl className="case-header-facts">
          <div><dt>范围</dt><dd>{project.scope}</dd></div>
          <div><dt>我的职责</dt><dd>{project.role}</dd></div>
          <div><dt>技术栈</dt><dd>{project.stack.join(' · ')}</dd></div>
        </dl>
      </header>
      <div className="case-body">
        <aside className="case-rail">
          <nav className="case-chapters" aria-label={`${project.title}章节`}>
            <a href={`#${project.id}-delivery`}>交付重点</a>
            <a href={`#${project.id}-context`}>业务与判断</a>
            <a href={`#${project.id}-demo`}>流程演示</a>
            <a href={`#${project.id}-design`}>系统设计</a>
            <a href={`#${project.id}-validation`}>验证与边界</a>
          </nav>
          {project.repository && <a className="button-link repository-link" href={project.repository.url} target="_blank" rel="noreferrer">{project.repository.label}<ExternalLink size={14} /></a>}
        </aside>
        <div className="case-content">
          <section className="case-delivery" id={`${project.id}-delivery`}>
            <h3 className="case-section-label">交付重点</h3>
            <p className="case-lead">{demo.takeaway}</p>
            <ul>{project.deliverables.map((item) => <li key={item}><Check size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul>
          </section>
          <section className="case-narrative" id={`${project.id}-context`}>
            <div><h3 className="case-section-label">业务现场</h3><p>{project.situation}</p></div>
            <div><h3 className="case-section-label">方案判断</h3><p>{project.approach}</p></div>
          </section>
          <div id={`${project.id}-demo`} className="case-demo-anchor">
            <CaseExperience project={project} />
            {project.id === 'medical-concierge' && <ChatbotDemo />}
          </div>
          <ResponsiveDetails label="系统设计与验证" className="case-engineering-details">
            <section className="architecture-section" id={`${project.id}-design`}>
              <h3 className="case-section-label">系统分层与职责</h3>
              <table className="architecture-table">
                <tbody>
                  {project.architecture.map(([name, description]) => <tr key={name}><th scope="row">{name}</th><td>{description}</td></tr>)}
                </tbody>
              </table>
            </section>
            <section className="decisions-section">
              <h3 className="case-section-label">关键设计决策</h3>
              <ol className="decision-list">
                {project.decisions.map(([title, description]) => <li key={title}><h4>{title}</h4><p>{description}</p></li>)}
              </ol>
            </section>
            <section className="verification-section" id={`${project.id}-validation`}>
              <h3 className="case-section-label">验证方式与边界</h3>
              <ul>{project.verification.map((item) => <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>)}</ul>
            </section>
          </ResponsiveDetails>
        </div>
      </div>
    </article>
  );
}

function PortfolioPage({ theme, onThemeChange }) {
  useEffect(() => {
    document.title = '项目案例 — 游丰奕';
    if (!window.location.hash) return;
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerHeight - 12, behavior: 'auto' });
    }));
  }, []);
  return (
    <>
      <Header projectPage theme={theme} onThemeChange={onThemeChange} />
      <main className="portfolio-main">
        <section className="portfolio-hero" id="home">
          <div className="page-width portfolio-hero-inner">
            <a className="back-link" href="index.html"><ArrowLeft size={15} /> 返回首页</a>
            <p className="eyebrow">项目案例</p>
            <ParticleTitle as="h1" variant="page" lines={['每一次交付，', '都有判断的依据。']} />
            <p className="hero-intro">先看业务问题，再看方案判断、系统分层与验证边界。三个案例，呈现我如何把数据、模型、规则和人工流程连接成可用系统。</p>
          </div>
        </section>
        <nav className="case-index page-width" id="case-index" aria-label="案例目录">
          {projects.map((project) => (
            <a key={project.id} href={`#${project.id}`}>
              <span className="case-index-number">{project.number}</span>
              <span className="case-index-text"><strong>{project.title}</strong><small>{caseDemos[project.id].capability}</small></span>
              <ArrowDown size={18} aria-hidden="true" />
            </a>
          ))}
        </nav>
        <div className="page-width case-studies">
          {projects.map((project) => <ProjectCase project={project} key={project.id} />)}
        </div>
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
  const [theme, setTheme] = useBenchmarkTheme();
  return (
    <div className={isProjectPage ? 'app project-app' : 'app'}>
      <div className="screen-site">
        <ReadingProgress />
        {isProjectPage ? (
          <PortfolioPage theme={theme} onThemeChange={setTheme} />
        ) : (
          <HomePage theme={theme} onThemeChange={setTheme} />
        )}
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
