import { contact, education, experience, projects } from '../content.js';

export function ResumeDocument() {
  return (
    <article className="resume-document" aria-label="游丰奕的打印简历">
      <header className="resume-header">
        <div><h1>游丰奕</h1><p>AI 应用工程师 / FDE 方向</p></div>
        <address>邮箱：{contact.email}<br />微信：{contact.wechat}<br /><a href={contact.github}>{contact.github.replace('https://', '')}</a></address>
      </header>
      <p className="resume-profile">软件技术背景，参与企业系统集成、Agent 设计与 AI 服务交付。围绕业务问题梳理需求与数据边界，把模型、规则和人工流程连接成可追溯、可验证的工作流。</p>
      <section className="resume-projects">
        <h2>项目实践</h2>
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
      <section className="resume-education"><h2>教育背景</h2><p><span><strong>{education.school}</strong> · {education.major}</span><time>{education.period}</time></p></section>
    </article>
  );
}
