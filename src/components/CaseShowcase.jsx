import { useEffect, useId, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Expand, FileText, Layers, Play, X } from 'lucide-react';
import { caseDemos } from '../caseDemos.js';
import { weeklySamples, weeklyStep } from '../weeklyDemo.js';
import './CaseShowcase.css';

export function CaseVisual({ project, onOpen }) {
  const demo = caseDemos[project.id];
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 140, damping: 24 });
  const smoothY = useSpring(y, { stiffness: 140, damping: 24 });
  const rotateY = useTransform(smoothX, [-.5, .5], [-3, 3]);
  const rotateX = useTransform(smoothY, [-.5, .5], [3, -3]);
  const trackPointer = (event) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - .5);
    y.set((event.clientY - rect.top) / rect.height - .5);
  };

  return (
    <motion.button
      type="button"
      className={`case-visual theme-${demo.theme}`}
      aria-label={`预览${project.title}`}
      onClick={onOpen}
      onPointerMove={trackPointer}
      onPointerLeave={() => { x.set(0); y.set(0); }}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
    >
      <img src={demo.image} alt={demo.imageAlt} loading="lazy" width="1536" height="1024" />
      <span className="visual-open"><Expand size={15} /> 预览交付</span>
    </motion.button>
  );
}

export function CaseExperience({ project }) {
  const demo = caseDemos[project.id];
  const [view, setView] = useState('workflow');
  const [step, setStep] = useState(0);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [sourceQuote, setSourceQuote] = useState('');
  const reduced = useReducedMotion();
  const isWeekly = project.id === 'weekly-intelligence';
  const sample = isWeekly ? weeklySamples[sampleIndex] : demo.sample;
  const active = isWeekly ? weeklyStep(sample, step) : demo.steps[step];
  const chooseStep = (next) => { setStep(next); setSourceOpen(false); setSourceQuote(''); };
  const instanceId = useId();
  const tabId = `demo-${project.id}-${instanceId}`;
  const workflowRef = useRef(null);
  const coverRef = useRef(null);
  const handleTabKey = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'workflow' : event.key === 'End' ? 'cover' : view === 'workflow' ? 'cover' : 'workflow';
    setView(next);
    (next === 'workflow' ? workflowRef : coverRef).current?.focus();
  };

  return (
    <section className={`case-experience theme-${demo.theme}`} aria-label={`${project.title}展示演示`}>
      <div className="demo-heading">
        <h3>{demo.previewTitle}</h3>
      </div>
      <div className="demo-tabs" role="tablist" aria-label="案例展示方式" onKeyDown={handleTabKey}>
        <button ref={workflowRef} type="button" role="tab" id={`${tabId}-workflow`} aria-controls={`${tabId}-workflow-panel`} aria-selected={view === 'workflow'} tabIndex={view === 'workflow' ? 0 : -1} onClick={() => setView('workflow')}><Play size={13} /> 工作流演示</button>
        <button ref={coverRef} type="button" role="tab" id={`${tabId}-cover`} aria-controls={`${tabId}-cover-panel`} aria-selected={view === 'cover'} tabIndex={view === 'cover' ? 0 : -1} onClick={() => setView('cover')}><Layers size={14} /> 界面展示</button>
      </div>
      <div role="tabpanel" id={`${tabId}-cover-panel`} aria-labelledby={`${tabId}-cover`} hidden={view !== 'cover'} tabIndex={0}>
        <figure className="demo-cover"><img src={demo.image} alt={demo.imageAlt} loading="lazy" width="1536" height="1024" /><figcaption>{demo.imageNote}</figcaption></figure>
      </div>
      <div role="tabpanel" id={`${tabId}-workflow-panel`} aria-labelledby={`${tabId}-workflow`} hidden={view !== 'workflow'} tabIndex={0}>
        {isWeekly && <div className="demo-scenarios" role="group" aria-label="选择示例周报">{weeklySamples.map((item, index) => <button key={item.id} type="button" aria-pressed={sampleIndex === index} onClick={() => { setSampleIndex(index); chooseStep(0); }}>{item.label}</button>)}</div>}
        <p className="demo-context">{isWeekly ? '选择一份示例周报，查看结构化结果与原文依据。' : '使用示例数据展示处理逻辑，不提交资料。'}</p>
        <div className="demo-workspace">
          <div className="demo-window-bar"><span><i /><i /><i /></span><strong>{project.englishTitle}</strong></div>
          <div className="demo-workspace-body">
            <div className="demo-step-list" role="group" aria-label="选择处理步骤">
              {project.workflow.map((title, index) => (
                <button type="button" key={title} aria-pressed={index === step} onClick={() => chooseStep(index)}>
                  <span>{index < step ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</span><strong>{title}</strong>{index === step && <ArrowRight size={13} />}
                </button>
              ))}
            </div>
            <div className="demo-stage">
              <div className="demo-stage-meta"><span>处理节点 {String(step + 1).padStart(2, '0')} / {String(project.workflow.length).padStart(2, '0')}</span><span><i /> 来源保留</span></div>
              <motion.div key={`${sampleIndex}-${step}`} className="demo-stage-content" initial={{ opacity: reduced ? 1 : .5, y: reduced ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .18 }}>
                <h4>{project.workflow[step]}</h4><p>{active.note}</p>
                {isWeekly && step === 0 ? <blockquote className="demo-input"><span>输入 · {sample.sourceId}</span><p>{sample.source}</p></blockquote> : <div className="demo-data-list">
                  {sample.items.map((item) => isWeekly ? <button className="demo-data-row" type="button" key={item.name} aria-label={`查看${item.name}的原文依据`} aria-controls={`${tabId}-source`} onClick={() => { setSourceOpen(true); setSourceQuote(item.quote); }}><FileText size={15} /><span>{item.name}<small>{item.team ?? '部门未提供'}</small></span><b>{item.status}</b><ArrowUpRight size={14} /></button> : <div className="demo-data-row" key={item.name}><FileText size={15} /><span>{item.name}<small>{item.team}</small></span><b>{item.status}</b></div>)}
                </div>}
                <div className="demo-result" aria-live="polite"><Check size={15} /><p>{active.output}</p></div>
                <details className="demo-payload"><summary>查看此节点的数据结构</summary><pre>{JSON.stringify(active.payload, null, 2)}</pre></details>
              </motion.div>
              <button className="demo-source-toggle" type="button" aria-expanded={sourceOpen} aria-controls={`${tabId}-source`} onClick={() => { setSourceOpen((open) => !open); setSourceQuote(''); }}><FileText size={15} /> {sourceOpen ? '收起原文依据' : '查看原文依据'} <ArrowUpRight size={13} /></button>
              <div id={`${tabId}-source`} className="demo-source" hidden={!sourceOpen} role="region" aria-label="原文依据" aria-live="polite">{sourceQuote ? <><strong>对应原句</strong><mark>{sourceQuote}</mark><small>完整原文 · {sample.sourceId}</small></> : null}{sample.source}</div>
            </div>
          </div>
          <div className="demo-controls">
            <span>点击步骤，查看从输入到交付的处理过程。</span>
            <div><button type="button" aria-label="上一步" disabled={step === 0} onClick={() => chooseStep(step - 1)}><ChevronLeft size={16} /></button><button type="button" onClick={() => chooseStep(step === project.workflow.length - 1 ? 0 : step + 1)}>{step === project.workflow.length - 1 ? '重新演示' : '下一步'}<ChevronRight size={15} /></button></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CaseDialog({ project, onClose }) {
  const dialogRef = useRef(null);
  const closeDialog = () => { dialogRef.current.close(); onClose(); };
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog className="case-dialog" ref={dialogRef} aria-labelledby="case-dialog-title" onCancel={(event) => { event.preventDefault(); closeDialog(); }} onClick={(event) => {
      if (event.target !== dialogRef.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
    }}>
      <div className="dialog-top"><div><span>案例预览</span><h2 id="case-dialog-title">{project.title}</h2></div><button type="button" autoFocus aria-label="关闭案例预览" onClick={closeDialog}><X size={20} /></button></div>
      <CaseExperience project={project} />
      <div className="dialog-bottom"><p>查看完整案例，了解业务背景、设计决策与验证边界。</p><a className="button-primary" href={`portfolio.html#${project.id}`}>阅读完整案例<ArrowUpRight size={16} /></a></div>
    </dialog>
  );
}
