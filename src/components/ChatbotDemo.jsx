import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RotateCcw, X } from 'lucide-react';

export function ChatbotDemo() {
  const [status, setStatus] = useState('idle');
  const [attempt, setAttempt] = useState(0);
  const frameRef = useRef(null);
  const active = status !== 'idle';

  useEffect(() => {
    if (!active) return;
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) setStatus('error');
    }, 20000);
    const receive = (event) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (!['resume-chatbot-ready', 'resume-chatbot-error'].includes(event.data?.type)) return;
      settled = true;
      clearTimeout(timeout);
      setStatus(event.data.type === 'resume-chatbot-ready' ? 'ready' : 'error');
    };
    window.addEventListener('message', receive);
    return () => { clearTimeout(timeout); window.removeEventListener('message', receive); };
  }, [active, attempt]);

  const start = () => { setAttempt((value) => value + 1); setStatus('loading'); };

  return (
    <section className="chatbot-demo" aria-label="在线客服体验">
      <div className="chatbot-demo-heading"><div><h3>体验真实的客服入口</h3><p>由独立客服服务提供，仅用于了解交互；请勿提交个人医疗资料。</p></div>
        {active ? <button type="button" className="button-text" onClick={() => setStatus('idle')}><X size={16} />结束体验</button> : <button type="button" className="print-button" onClick={start}>开启在线体验<ArrowUpRight size={16} /></button>}
      </div>
      <p className="chatbot-status" role="status">{status === 'loading' ? '正在连接客服界面…' : status === 'ready' ? '客服界面已就绪，请点击区域内的对话按钮。' : ''}</p>
      {status === 'error' && <div className="chatbot-error" role="alert"><p>暂时无法加载客服界面，请重试或查看上方的工作流演示。</p><button type="button" className="print-button" onClick={start}><RotateCcw size={16} />重新加载</button></div>}
      {active && status !== 'error' && <iframe key={attempt} ref={frameRef} className={`chatbot-frame${status === 'ready' ? ' ready' : ''}`} src="chatbot-demo.html" title="独立的在线客服体验区域" referrerPolicy="no-referrer" />}
    </section>
  );
}
