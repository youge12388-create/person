import { contact, experience, projects } from '../content.js';

export function ResumeDocument() {
  return (
    <article className="resume-document" aria-label="游丰奕的打印简历">
      <header className="resume-header">
        <div><h1>游丰奕</h1><p>FDE 工程师 / AI 应用交付</p></div>
        <address>邮箱：{contact.email}<br />微信：{contact.wechat}<br /><a href={contact.github}>{contact.github.replace('https://', '')}</a></address>
      </header>
      <p className="resume-profile">偏工程型的 AI 应用交付者，能从业务现场拆问题，也能把数据、模型、规则和系统接到一条线上；擅长把模糊、依赖人工的流程重构成可运行、可追溯、可验收的 AI 工作流。</p>
      <section className="resume-skills">
        <h2>专业技能</h2>
        <p><strong>AI 应用</strong> LLM API · RAG / 知识库 · Structured Output · Prompt Engineering · Agent / Skill 设计 · 规则约束与评测</p>
        <p><strong>后端与数据</strong> Python · FastAPI · Node.js · PostgreSQL · MySQL · Redis</p>
        <p><strong>前端与交付</strong> React · Next.js · TypeScript · Docker · Nginx · Git；接口联调、部署与日志排查</p>
      </section>
      <section className="resume-projects">
        <h2>项目经历</h2>
        {projects.map((project) => (
          <section className="resume-project" key={project.id}>
            <h3>{project.title}</h3>
            <p className="resume-role">职责：{project.role}</p>
            <p>{project.summary}</p>
            <ul>{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="resume-stack">{project.stack.join(' · ')}</p>
          </section>
        ))}
      </section>
      <section className="resume-background">
        <h2>工作经历</h2>
        {experience.map((item) => <div className="resume-experience" key={item.company}><p><strong>{item.title} · {item.company}</strong><time>{item.period}</time></p><p>{item.details}</p></div>)}
      </section>
    </article>
  );
}
