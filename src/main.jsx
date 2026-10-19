import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, MotionConfig, useReducedMotion, useScroll, useSpring } from 'motion/react';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Mail,
  Menu,
  X,
} from 'lucide-react';
import { contact, experience, projects } from './content.js';
import { caseDemos } from './caseDemos.js';
import { CaseDialog, CaseExperience, CaseVisual } from './components/CaseShowcase.jsx';
import { ResumeDocument } from './components/ResumeDocument.jsx';
import { ChatbotDemo } from './components/ChatbotDemo.jsx';
import PointerParticles from './components/PointerParticles.jsx';
import './styles.css';

const portfolioPath = 'portfolio.html';
const isProjectPage = window.location.pathname.endsWith(portfolioPath);

function PrintButton() {
  return (
    <button type="button" className="print-button" title="打开打印窗口，选择保存为 PDF" onClick={() => window.print()}>
      <Download size={15} aria-hidden="true" />
      <span>保存简历 PDF</span>
    </button>
  );
}

function Header({ projectPage = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = projectPage
    ? [
        ['首页', 'index.html'],
        ['案例索引', '#case-index'],
        ['交付方法', 'index.html#approach'],
        ['联系', '#contact'],
      ]
    : [
        ['项目案例', '#projects'],
        ['交付方法', '#approach'],
        ['经历', '#experience'],
        ['联系', '#contact'],
      ];

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="index.html" aria-label="游丰奕，返回首页">
          <span className="brand-name">游丰奕</span>
          <span className="brand-divider" />
          <span className="brand-role">AI ENGINEERING<br />FDE DIRECTION</span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? '关闭导航' : '打开导航'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`primary-nav${menuOpen ? ' open' : ''}`} aria-label="主导航">
          {nav.map(([label, href]) => (
            <a
              href={href}
              key={label}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <PrintButton />
        </nav>
      </div>
    </header>
  );
}

function HeroField() {
  const project = projects[0];

  return (
    <div className="hero-visual">
      <div className="portrait-halo" aria-hidden="true" />
      <picture className="portrait-frame">
        <img src="./image/portrait-1200.webp" srcSet="./image/portrait-640.webp 640w, ./image/portrait-1200.webp 1200w" sizes="(max-width: 680px) 280px, (max-width: 1020px) 45vw, 620px" width="1200" height="900" fetchPriority="high" alt="游丰奕，FDE 工程师 / AI 应用交付" />
      </picture>
      <div className="field-note">
        <span className="field-note-label">从业务问题到系统交付</span>
        <div className="field-note-content">
          <strong>{project.title}</strong>
          <span>独立负责需求、架构与核心开发</span>
          <a href={`${portfolioPath}#${project.id}`}>查看交付细节 <ArrowUpRight size={14} /></a>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-band" id="home">
      <div className="hero-inner page-width">
        <div className="hero-copy">
          <p className="hero-identity"><strong>游丰奕</strong><span>FDE 工程师 · AI 应用交付</span></p>
          <h1><span className="hero-line"><span>把 AI 接入业务，</span></span><em className="hero-line"><span>把方案交付成系统。</span></em></h1>
          <p className="hero-intro">
            把 40 人组织的周报管理、196 所高校的选校研究和跨境医疗咨询，重构成可追溯、可验证的 AI 工作流。
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#preview-weekly-intelligence">看代表项目 <ArrowDownRight size={17} /></a>
            <a className="button-text" href="#contact">联系我 <ArrowRight size={16} /></a>
          </div>
          <div className="hero-capabilities" aria-label="核心能力"><span>系统集成</span><span>Agent / RAG</span><span>验证与追溯</span></div>
        </div>
        <HeroField />
      </div>
    </section>
  );
}

function ProjectRow({ project, onPreview }) {
  const demo = caseDemos[project.id];
  const reduced = useReducedMotion();
  return (
    <article className={`project-row theme-${demo.theme}`} id={`preview-${project.id}`}>
      <motion.div className="project-visual-wrap" initial={reduced ? false : { clipPath: 'inset(0 0 12% 0 round 22px)', opacity: .65 }} whileInView={{ clipPath: 'inset(0 0 0% 0 round 22px)', opacity: 1 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .65, ease: [.22, 1, .36, 1] }}><CaseVisual project={project} onOpen={onPreview} /></motion.div>
      <div className="project-main">
        <div className="project-topline"><span className="project-file">CASE {project.number}</span><span>{demo.capability}</span></div>
        <h3>{project.title}</h3>
        <p className="project-summary">{project.summary}</p>
        <p className="project-takeaway">{demo.takeaway}</p>
        <ul className="project-evidence">{demo.evidence.map((item) => <li key={item}><Check size={13} />{item}</li>)}</ul>
        <div className="tag-list">
          {project.stack.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="project-role"><span>我的职责</span><p>{project.role}</p></div>
        <div className="project-row-actions"><a className="text-link" href={`${portfolioPath}#${project.id}`}>阅读完整案例 <ArrowUpRight size={16} /></a><button type="button" onClick={onPreview}>交互预览 <ArrowRight size={14} /></button></div>
      </div>
    </article>
  );
}

function ProjectsSection() {
  const [previewProject, setPreviewProject] = useState(null);
  return (
    <section className="projects-section page-width" id="projects">
      <div className="section-heading">
        <div>
          <h2>用具体交付，回答能力。</h2>
          <span className="section-index">SELECTED WORK / CASE STUDIES</span>
          <p className="section-intro">先看我解决了什么，再看我是如何做出判断的。</p>
        </div>
        <a className="text-link" href={portfolioPath}>全部案例 <ArrowRight size={16} /></a>
      </div>
      <div className="project-list">
        {projects.map((project) => <ProjectRow project={project} key={project.id} onPreview={() => setPreviewProject(project)} />)}
      </div>
      {previewProject && <CaseDialog project={previewProject} onClose={() => setPreviewProject(null)} />}
    </section>
  );
}

const methodItems = [
  ['01', '澄清真实问题', '了解用户、流程、数据来源和人工判断边界，确定这次交付要解决的具体环节。', '需求与边界清单', '明确谁使用、在哪一步使用、哪些判断必须由人负责，以及怎样才算完成。', '医疗客服先区分服务咨询与专业判断，再决定知识库回答和人工接管的边界。'],
  ['02', '接入现有系统', '围绕已有 API、文档和业务数据建模，让 AI 工作流接入实际信息源。', '数据模型与接入链路', '保存原始来源、处理状态和关联关系，让后续分析能够回到证据。', '周报平台把员工、部门、原始周报与工作事项拆成四类核心模型。'],
  ['03', '拆分模型与规则', '结构化提取交给模型，确定性约束交给规则；不确定内容进入待确认流程。', '模型约束与规则流程', '让明确条件由规则执行，让模型处理语义空间，并保留无法确定的状态。', '选校 Agent 先过滤确定性条件，再对专业背景等要求进行语义判断。'],
  ['04', '验证并交接', '用真实任务场景回归结果，保留来源、状态与人工接管路径，支持后续迭代。', '回归场景与交接说明', '检查正常、缺失、重复和异常输入，交付可以复核的结果与后续处理方式。', '案例保留来源核验、失败重试、待确认状态和人工出口等验证路径。'],
];

function ApproachSection() {
  const [activeMethod, setActiveMethod] = useState(0);
  const method = methodItems[activeMethod];
  return (
    <section className="approach-section" id="approach">
      <div className="page-width">
        <div className="section-heading approach-heading">
          <div>
            <h2>从现场问题，推进到可复核的交付。</h2>
            <span className="section-index">HOW I WORK</span>
          </div>
          <p>每个项目的场景不同，但交付都从明确问题与数据边界开始，再逐层把方案跑通。</p>
        </div>
        <div className="method-list">
          {methodItems.map(([number, title, desc], index) => (
            <button type="button" className="method-item" key={number} aria-pressed={activeMethod === index} aria-controls="method-deliverable" onClick={() => setActiveMethod(index)}>
              <span className="method-number">{number}</span>
              <span className="method-title">{title}</span>
              <span className="method-description">{desc}</span>
              <ArrowUpRight className="method-arrow" size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="method-deliverable" id="method-deliverable" aria-live="polite"><span>这一步的交付物</span><div key={method[0]}><h3>{method[3]}</h3><p>{method[4]}</p><small>{method[5]}</small></div><span className="method-step-count">{method[0]} / 04</span></div>
      </div>
    </section>
  );
}

function ExperienceSection() {
  return (
    <section className="experience-section page-width" id="experience">
      <div className="experience-intro">
        <h2>从业务问题到系统交付</h2>
        <span className="section-index">EXPERIENCE</span>
        <p>围绕 AI 应用落地，承担需求分析、数据建模、接口集成与系统验收。</p>
        <p>核心打法是先把业务流程和数据边界拆清，再用模型、规则和工程实现把它重构成可运行、可追溯、可验收的系统。</p>
      </div>
      <div className="experience-list">
        {experience.map((item) => (
          <article className="experience-item" key={item.company}>
            <time>{item.period}</time>
            <div>
              <h3>{item.title}</h3>
              <strong>{item.company}</strong>
              <p>{item.details}</p>
            </div>
          </article>
        ))}
      </div>
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
        {status === 'copied' ? <Check size={16} /> : <Copy size={16} />}
        <span>{status === 'copied' ? '已复制' : '复制'}</span>
      </button>
      <span className={`copy-feedback${status === 'error' ? ' visible' : ''}`} role="status">{status === 'error' ? '未能复制，请选择上方文字手动复制。' : status === 'copied' ? `${label}已复制` : ''}</span>
    </span>
  );
}

function ContactSection() {
  return (
    <section className="contact-section" id="contact">
      <div className="contact-inner page-width">
        <div>
          <h2>一起把 AI 接入真实业务。</h2>
          <span className="section-index">GET IN TOUCH</span>
          <p>欢迎交流 AI 应用工程、FDE 岗位与企业工作流项目。</p>
          <PrintButton />
        </div>
        <div className="contact-actions">
          <div className="contact-row"><Mail size={19} /><div><span>邮箱</span><a className="contact-email" href={`mailto:${contact.email}`}>{contact.email}</a></div><CopyButton value={contact.email} label="邮箱" /></div>
          <div className="contact-row"><span className="wechat-mark">W</span><div><span>微信</span><span className="contact-value">{contact.wechat}</span></div><CopyButton value={contact.wechat} label="微信" /></div>
          <a className="contact-social" href={contact.github} target="_blank" rel="noreferrer"><Code2 size={19} /> 查看 GitHub 代码与项目 <ExternalLink size={15} /></a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer page-width">
      <a href="#home">游丰奕 <span>·</span> AI ENGINEERING</a>
      <span>© 2026 · BUILT AROUND REAL WORK</span>
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

function ProjectCase({ project }) {
  return (
    <article className="case-study" id={project.id}>
      <header className="case-header">
        <div className="case-number">{project.number}</div>
          <div className="case-title-block">
          <h2>{project.title}</h2>
          <p className="case-english">{project.englishTitle}</p>
          <span className="case-category">{project.category}</span>
        </div>
        <div className="case-scope"><span>项目范围</span><strong>{project.scope}</strong></div>
      </header>
      <div className="case-body">
        <aside className="case-rail">
          <span>我的职责</span>
          <p>{project.role}</p>
          <span>技术与工具</span>
          <div className="case-stack">{project.stack.map((tag) => <i key={tag}>{tag}</i>)}</div>
          <nav className="case-chapters" aria-label={`${project.title}章节`}>
            <a href={`#${project.id}-delivery`}>交付重点</a>
            <a href={`#${project.id}-design`}>系统设计</a>
            <a href={`#${project.id}-validation`}>验证与边界</a>
            <a href="#contact">联系我</a>
          </nav>
          {project.repository && <a className="text-link repository-link" href={project.repository.url} target="_blank" rel="noreferrer">{project.repository.label}<ExternalLink size={14} /></a>}
          <a className="rail-link" href="#case-index">返回案例索引 <ArrowUpRight size={14} /></a>
        </aside>
        <div className="case-content">
          <section className="case-delivery" id={`${project.id}-delivery`}>
            <h3>交付重点</h3>
            <p>{caseDemos[project.id].takeaway}</p>
            <ul>{project.deliverables.map((item) => <li key={item}><Check size={16} /><span>{item}</span></li>)}</ul>
          </section>
          <section className="case-narrative">
            <div>
              <h3>业务现场</h3>
              <span className="case-label">CONTEXT</span>
              <p>{project.situation}</p>
            </div>
            <div>
              <h3>方案判断</h3>
              <span className="case-label">APPROACH</span>
              <p>{project.approach}</p>
            </div>
          </section>
          <CaseExperience project={project} />
          {project.id === 'medical-concierge' && <ChatbotDemo />}
          <section className="architecture-section" id={`${project.id}-design`}>
            <div className="case-section-title"><h3>系统分层与职责</h3><span className="case-label">SYSTEM DESIGN</span></div>
            <div className="architecture-list">
              {project.architecture.map(([name, description], index) => (
                <article className="architecture-row" key={name}>
                  <span className="architecture-index">{String(index + 1).padStart(2, '0')}</span>
                  <h4>{name}</h4>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="decisions-section">
            <div className="case-section-title"><h3>关键设计决策</h3><span className="case-label">ENGINEERING DECISIONS</span></div>
            <div className="decision-list">
              {project.decisions.map(([title, description], index) => (
                <article className="decision-row" key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><h4>{title}</h4><p>{description}</p></div>
                  <Check size={16} aria-hidden="true" />
                </article>
              ))}
            </div>
          </section>
          <section className="verification-section" id={`${project.id}-validation`}>
            <div className="case-section-title"><h3>验证方式与边界</h3><span className="case-label">VALIDATION & BOUNDARIES</span></div>
            <ul>
              {project.verification.map((item) => <li key={item}><Check size={15} /><span>{item}</span></li>)}
            </ul>
          </section>
        </div>
      </div>
    </article>
  );
}

function PortfolioPage() {
  useEffect(() => {
    document.title = '项目案例 — 游丰奕';
    if (window.location.hash) {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (!target) return;
        const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
        window.scrollTo({ top, behavior: 'auto' });
      }));
    }
  }, []);
  return (
    <>
      <Header projectPage />
      <main className="portfolio-main">
        <section className="portfolio-hero" id="home">
          <div className="page-width portfolio-hero-inner">
            <a className="back-link" href="index.html"><ArrowLeft size={15} /> 返回首页</a>
            <h1>每一次交付，<br /><em>都有判断的依据。</em></h1>
            <span className="section-index">CASE FILES / AI DELIVERY</span>
            <p>先看业务问题，再看方案判断、系统分层与验证边界。三个案例，呈现我如何把数据、模型、规则和人工流程连接成可用系统。</p>
            <a className="portfolio-hero-link" href="#case-index">浏览案例 <ArrowDown size={15} /></a>
          </div>
        </section>
        <nav className="case-index page-width" id="case-index" aria-label="案例索引">
          {projects.map((project) => <a key={project.id} href={`#${project.id}`}><span>{project.number}</span><div><strong>{project.title}</strong><small>{caseDemos[project.id].capability}</small></div><ArrowDownRight size={20} /></a>)}
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
  return (
    <div className={isProjectPage ? 'app project-app' : 'app'}>
      <div className="screen-site"><ReadingProgress /><PointerParticles />{isProjectPage ? <PortfolioPage /> : <HomePage />}</div>
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
