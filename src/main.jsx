import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  Clapperboard,
  Clock3,
  Download,
  FileText,
  Gauge,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  PlaySquare,
  Send,
  Sparkles,
  User,
  Workflow,
  Boxes,
  WandSparkles,
  Bot,
  Target,
  Code2,
  Database,
  BrainCircuit,
  Hexagon,
} from 'lucide-react';
import Particles from './components/Particles/Particles.jsx';
import portraitImage from './image/职业照片2.png';
import videoImage from './image/ai短视频.png';
import comicImage from './image/ai漫画.png';
import orderImage from './image/自动化订单.png';
import commentImage from './image/评论区数据采集.png';
import dashboardImage from './image/竞品分析看板.png';
import './styles.css';

const navItems = [
  ['首页', '#home'],
  ['关于', '#about'],
  ['经历', '#experience'],
  ['项目', '#projects'],
  ['技能', '#skills'],
  ['联系', '#contact'],
];

const workflowItems = [
  ['Prompt Library', '提示词库', FileText],
  ['SOP Builder', 'SOP 构建', CheckSquare],
  ['Content Pipeline', '内容生产流水线', PlaySquare],
  ['RPA Workflow', '自动化流程', Workflow],
  ['Training Kit', '培训资料库', GraduationCap],
  ['Data Monitor', '数据监控', Gauge],
];

const outputItems = ['AI 教程', 'AI 短剧', 'AI 漫画', '运营报告', 'SOP 文档'];

const stats = [
  [Clapperboard, 'AI漫剧', '剧情脚本、分镜与视频生产'],
  [Sparkles, 'AI漫画', '角色风格、分镜与批量出图'],
  [PlaySquare, 'AI教程', '课程内容、教程脚本与经验沉淀'],
  [FileText, '企业AI培训与SOP', '体系化交付，快速复制落地'],
];

const profileRows = [
  [MapPin, '所在地', '广东省'],
  [CalendarDays, '出生日期', '2002.11.25'],
  [Clock3, '婚姻状况', '未婚'],
  [Mail, '邮箱', 'you123886@163.com'],
  [Phone, '电话', '17376526436'],
];

const projects = [
  ['AI教程SOP与提示词库', '统一标准，复用率高', '沉淀 SOP 与提示词库', '复用效率提升 60%+', 'doc'],
  ['AI短视频生产', '视频生产周期长', '搭建脚本 + 生成流水线', '效率提升 3 倍', 'video', videoImage],
  ['AI漫画创作', '风格不统一，出图慢', '风格库 + 批量生成', '出图效率提升 3 倍', 'comic', comicImage],
  ['自动化订单流程', '人工处理耗时易错', 'RPA 自动化处理', '日均 500+，人工-30%', 'table', orderImage],
  ['评论数据采集', '数据分散，分析低效', '采集清洗 + 可视化分析', '分析效率提升 70%', 'chart', commentImage],
  ['竞品分析看板', '竞品信息分散', '搭建看板与监控机制', '洞察时效提升 50%', 'dashboard', dashboardImage],
];

const tools = [
  ['影刀RPA', 'yingdao', Target],
  ['即梦 AI', 'jimeng', WandSparkles],
  ['ChatGPT', 'chatgpt', Bot],
  ['Claude', 'claude', Sparkles],
  ['Gemini', 'gemini', BrainCircuit],
  ['通义千问', 'qwen', Hexagon],
  ['Python', 'python', Code2],
  ['MySQL', 'mysql', Database],
  ['HTML/CSS/JS', 'web', Code2],
  ['OpenClaw', 'openclaw', OpenClawLogo],
];

const advantages = [
  [Sparkles, '实操经验', '丰富的 AI 内容生产与自动化项目实践，快速搭建、上线并持续迭代优化。'],
  [Bot, '智能体能力', '熟悉多种 AI Agent、RPA 与模型工具，能组合能力解决复杂业务问题。'],
  [Target, '落地能力', '擅长体系化 SOP 与培训资料，帮助团队快速复制方法、提升效率。'],
];

function OpenClawLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M9.4 11.2c.7-3.8 3.2-6.6 6.6-6.6s5.9 2.8 6.6 6.6c2.5.7 4.4 2.9 4.4 5.6 0 3.6-3.2 6.2-7.4 6.2h-7.2C8.2 23 5 20.4 5 16.8c0-2.7 1.9-4.9 4.4-5.6Z"
        fill="#ef4444"
      />
      <path d="M7.2 11.7 3.4 8.2M24.8 11.7l3.8-3.5" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12.5" cy="14.8" r="1.8" fill="#111827" />
      <circle cx="19.5" cy="14.8" r="1.8" fill="#111827" />
      <path d="M12.8 19.2c1.8 1.2 4.6 1.2 6.4 0" stroke="#991b1b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WorkflowVisual() {
  return (
    <article className="hero-visual" aria-label="AI Workflow">
      <Particles
        className="hero-particles"
        particleCount={55}
        particleColors={['#1f5cff', '#74a8ff', '#dbeafe']}
        moveParticlesOnHover
        particleHoverFactor={0.25}
      />

      <img className="portrait-bg" src={portraitImage} alt="游丰奕职业照片" />

      <div className="visual-top">
        <span className="status-dot" />
        <span>AI Workflow</span>
      </div>

      <div className="workflow-list">
        {workflowItems.map(([title, desc, Icon]) => (
          <div className="workflow-item" key={title}>
            <span className="workflow-icon"><Icon size={18} /></span>
            <span><b>{title}</b><small>{desc}</small></span>
            <i />
          </div>
        ))}
      </div>

      <div className="ai-hub">
        <Boxes size={28} />
        <small>AI 内容中台</small>
      </div>

      <div className="output-card">
        <b>输出成果</b>
        {outputItems.map((item) => (
          <span key={item}><FileText size={15} />{item}</span>
        ))}
      </div>

      <svg className="flow-lines" viewBox="0 0 720 440" preserveAspectRatio="none" aria-hidden="true">
        <path d="M175 70 C 238 70 236 205 352 210" />
        <path d="M175 132 C 238 132 250 207 352 214" />
        <path d="M175 194 C 250 194 272 215 352 218" />
        <path d="M175 256 C 248 256 270 225 352 222" />
        <path d="M175 318 C 236 318 250 235 352 226" />
        <path d="M175 380 C 235 380 238 248 352 230" />
        <path d="M432 220 C 475 220 493 210 520 204" />
      </svg>
    </article>
  );
}

function ProjectThumb({ type, image, title }) {
  if (image) {
    return (
      <div className={`project-thumb image-thumb ${type}`}>
        <img src={image} alt={`${title}项目截图`} loading="lazy" />
      </div>
    );
  }

  return (
    <div className={`project-thumb ${type}`}>
      <div className="screen-bar" />
      <div className="thumb-body">
        <i /><i /><i /><i /><i /><i />
      </div>
    </div>
  );
}

function App() {
  return (
    <main className="page">
      <header className="topbar">
        <div className="brand-mark">YY</div>
        <nav aria-label="主导航">
          {navItems.map(([label, href], index) => (
            <a className={index === 0 ? 'active' : ''} key={href} href={href}>{label}</a>
          ))}
        </nav>
        <button className="download-btn" onClick={() => window.print()}>
          <Download size={17} />
          下载简历
        </button>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow">你好，我是</div>
          <h1 className="hero-name">游丰奕<span>。</span></h1>
          <h2>AI 内容生产与自动化流程实践者</h2>
          <p>
            专注于 AI 内容生产、提示词系统、RPA 自动化流程、培训资料与企业 AI 落地，
            帮助团队更高效地产出内容、沉淀知识与提升业务效率。
          </p>
          <div className="hero-actions">
            <a className="primary-btn" href="#projects">查看作品 <ArrowRight size={17} /></a>
            <a className="ghost-btn" href="#contact"><Send size={17} /> 联系我</a>
          </div>
        </div>
        <WorkflowVisual />
      </section>

      <section className="stats-grid" aria-label="关键数据">
        {stats.map(([Icon, value, label]) => (
          <div className="stat-card" key={value}>
            <span className="round-icon"><Icon size={24} /></span>
            <div>
              <strong>{value}</strong>
              <p>{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="profile-grid" id="about">
        <article className="panel about-card">
          <h3><User size={22} />关于我</h3>
          <div className="profile-list">
            {profileRows.map(([Icon, label, value]) => (
              <div className="profile-row" key={label}>
                <span><Icon size={17} />{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="panel education-card">
          <h3><GraduationCap size={22} />教育背景</h3>
          <strong>广东机电职业技术学院</strong>
          <p>软件技术</p>
          <time>2022.09 - 2025.06</time>
        </article>

        <article className="panel experience-card" id="experience">
          <h3><BriefcaseBusiness size={22} />工作经历</h3>
          <div className="timeline">
            <div className="timeline-item">
              <time>2026.01<br />2026.05</time>
              <div>
                <h4>中科华府有限公司 · AI 产品专员</h4>
                <ul>
                  <li>负责 AI 教程 SOP、提示词模板、工具操作流程与培训资料的输出</li>
                  <li>参与 AI 短剧视频生产流程，优化内容策划与生成链路</li>
                  <li>参与 AI 漫画项目创作与迭代，沉淀创作方法与规范</li>
                </ul>
              </div>
            </div>
            <div className="timeline-item">
              <time>2025.01<br />2025.11</time>
              <div>
                <h4>深圳翰世电子科技有限公司 · 运营自动化支持实习生</h4>
                <ul>
                  <li>搭建订单自动化流程，日均 500+ 订单自动处理，减少人工干预 30%</li>
                  <li>梳理评论数据采集与清洗流程，输出竞品分析报表</li>
                  <li>沉淀运营 SOP 与知识库，提升团队协作与交付效率</li>
                </ul>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="panel project-section" id="projects">
        <div className="section-head">
          <h3>项目案例</h3>
          <a href="#contact">查看全部项目 <ArrowRight size={16} /></a>
        </div>
        <div className="project-grid">
          {projects.map(([title, challenge, action, result, type, image]) => (
            <article className="project-card" key={title}>
              <ProjectThumb type={type} image={image} title={title} />
              <h4>{title}</h4>
              <p><span>挑战</span>{challenge}</p>
              <p><span>行动</span>{action}</p>
              <p><span>成果</span>{result}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bottom-grid" id="skills">
        <article className="panel tools-panel">
          <h3>技能工具</h3>
          <div className="tools-list">
            {tools.map(([tool, tone, Icon]) => (
              <span className={`tool-logo ${tone}`} key={tool}>
                <i><Icon size={16} /></i>
                {tool}
              </span>
            ))}
          </div>
        </article>

        <article className="panel advantage-panel">
          <h3>我的优势</h3>
          <div className="advantages">
            {advantages.map(([Icon, title, desc]) => (
              <div className="advantage" key={title}>
                <span className="round-icon"><Icon size={24} /></span>
                <div>
                  <b>{title}</b>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="contact-bar panel" id="contact">
        <div>
          <h3>期待与你合作，共同创造价值</h3>
          <p>如果你对我的经历或项目感兴趣，欢迎随时联系我。</p>
        </div>
        <a className="contact-pill" href="mailto:you123886@163.com"><Mail size={20} />you123886@163.com</a>
        <a className="contact-pill" href="tel:17376526436"><Phone size={20} />17376526436</a>
        <a className="contact-main" href="mailto:you123886@163.com"><Send size={20} />联系我</a>
      </section>

      <footer>© 2025 游丰奕 · 保留所有权利</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
