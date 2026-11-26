import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCheck2,
  FileText,
  Layers,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { caseDemos } from '../caseDemos.js';
import {
  askWeeklyAgent,
  defaultWeeklyData,
  parseSampleReports,
  weeklyAgentPrompts,
  weeklyRawReports,
} from '../weeklyDemo.js';
import {
  BUDGET_OPTIONS,
  collectorSamples,
  GPA_PROFILES,
  LANGUAGE_OPTIONS,
  runUniversityMatcher,
  validateBrochureIngestion,
} from '../universityDemo.js';
import {
  medicalFaqEntries,
  medicalPresetPrompts,
  processMedicalTurn,
} from '../medicalDemo.js';
import { ChatbotDemo } from './ChatbotDemo.jsx';
import './CaseShowcase.css';

export function CaseVisual({ project, onOpen }) {
  const demo = caseDemos[project.id];
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 140, damping: 24 });
  const smoothY = useSpring(y, { stiffness: 140, damping: 24 });
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-3, 3]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [3, -3]);
  const trackPointer = (event) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.button
      type="button"
      className={`case-visual theme-${demo.theme}`}
      aria-label={`实操体验${project.title}`}
      onClick={onOpen}
      onPointerMove={trackPointer}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
    >
      <img src={demo.image} alt={demo.imageAlt} loading="lazy" width="1536" height="1024" />
      <span className="visual-open">
        <Play size={14} /> 实操体验 Demo
      </span>
    </motion.button>
  );
}

/* ============================================================================
 * 1. 企业微信周报工作台：极简大白话「AI 管理简报 + 周报 AI 助手」
 * ============================================================================ */
function WeeklyWorkbench({
  project,
  presetKey,
  presetNonce,
  replayNonce,
  onSyncRuntime,
  onToast,
}) {
  const reduced = useReducedMotion();
  const [subTab, setSubTab] = useState('brief'); // 'brief' | 'raw' | 'custom'
  const [customText, setCustomText] = useState(
    '研发组：支付对账脚本已完成。补充：对账脚本在并发下仍有报错，尚未通过验收。\n产品组：周报导出字段待确认。\n本周推进了客户历史账单补录，目前还有问题需要处理。'
  );
  const [customActive, setCustomActive] = useState(false);
  const [expandedQuoteId, setExpandedQuoteId] = useState('R4-1');

  const [isScanning, setIsScanning] = useState(!reduced);
  const [runSeed, setRunSeed] = useState(1);
  const [resolvedMap, setResolvedMap] = useState({});
  const [sendingId, setSendingId] = useState(null);

  // 周报 AI 助手对话状态
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'wk-init-1',
      role: 'agent',
      route: 'agent_alert',
      text: '已读完 5 份企微周报，发现 2 处重点隐患：张磊和李浩重复写“订单导出脚本”；陈默前后矛盾未过验收。可点上方快捷问题或直接提问。',
      highlightItemId: 'R1-1',
      suggestedAction: null,
    },
  ]);

  const chatLogRef = useRef(null);
  const itemRefs = useRef({});
  const timersRef = useRef([]);

  const focusItemQuote = useCallback((itemId) => {
    if (!itemId) return;
    setExpandedQuoteId(itemId);
    window.requestAnimationFrame(() => {
      const target = itemRefs.current[itemId];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, isThinking, streamingText]);

  const parsedResult = useMemo(() => {
    if (!customActive) {
      return {
        items: defaultWeeklyData.items,
        duplicatePairs: defaultWeeklyData.duplicatePairs,
        reports: weeklyRawReports,
      };
    }
    const reports = [
      { sourceId: 'CUSTOM', author: '自定义员工', team: null, rawText: customText.trim() || '（空）' },
    ];
    const parsed = parseSampleReports(reports);
    return { ...parsed, reports };
  }, [customActive, customText]);

  const triggerScan = useCallback(
    (label = '⚡ 人工 3 小时 → AI 10 秒排雷') => {
      clearTimers();
      setRunSeed((n) => n + 1);
      if (reduced) {
        setIsScanning(false);
        onSyncRuntime({ running: false, statusText: label, elapsedMs: 480 });
        return;
      }
      setIsScanning(true);
      onSyncRuntime({ running: true, statusText: '正在通读周报并核对原话...', elapsedMs: 0 });
      const t = setTimeout(() => {
        setIsScanning(false);
        onSyncRuntime({ running: false, statusText: label, elapsedMs: 560 });
      }, 560);
      timersRef.current.push(t);
    },
    [clearTimers, onSyncRuntime, reduced]
  );

  useEffect(() => {
    triggerScan();
  }, [replayNonce]);

  const sendAgentQuery = useCallback(
    (rawQuery, overrideResult = null) => {
      const q = String(rawQuery || '').trim();
      if (!q || isThinking) return;
      const pool = overrideResult || parsedResult;

      const userMsg = {
        id: `wk-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: q,
      };
      setMessages((prev) => [...prev, userMsg]);
      setChatInput('');

      const res = askWeeklyAgent(q, pool.items, pool.reports, pool.duplicatePairs);
      const botId = `wk-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (reduced) {
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'agent',
            route: res.route,
            text: res.answer,
            highlightItemId: res.highlightItemId,
            suggestedAction: res.suggestedAction,
          },
        ]);
        if (res.highlightItemId) setExpandedQuoteId(res.highlightItemId);
        return;
      }

      setIsThinking(true);
      onSyncRuntime({ running: true, statusText: '周报 AI 助手正在检索员工原话...' });

      const tThink = setTimeout(() => {
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'agent',
            route: res.route,
            text: res.answer,
            highlightItemId: res.highlightItemId,
            suggestedAction: res.suggestedAction,
          },
        ]);
        if (res.highlightItemId) setExpandedQuoteId(res.highlightItemId);

        setStreamingMsgId(botId);
        setStreamingText('');
        let idx = 0;
        const streamTimer = setInterval(() => {
          idx += 5;
          if (idx >= res.answer.length) {
            setStreamingMsgId(null);
            setStreamingText('');
            clearInterval(streamTimer);
            onSyncRuntime({
              running: false,
              statusText:
                res.route === 'guard_no_fabrication'
                  ? '🛡️ 原文未写日期，已拒绝猜测'
                  : '⚡ 人工 3 小时 → AI 10 秒排雷',
              elapsedMs: 420,
            });
          } else {
            setStreamingText(res.answer.slice(0, idx));
          }
        }, 14);
        timersRef.current.push(streamTimer);
      }, 320);
      timersRef.current.push(tThink);
    },
    [isThinking, onSyncRuntime, parsedResult, reduced]
  );

  // 响应首页快捷试玩预设
  useEffect(() => {
    if (!presetKey) return;
    setResolvedMap({});
    if (presetKey === 'team_dups') {
      setCustomActive(false);
      setSubTab('brief');
      triggerScan();
      const p = weeklyAgentPrompts.find((x) => x.key === 'dups');
      if (p) sendAgentQuery(p.query, { ...defaultWeeklyData, reports: weeklyRawReports });
    } else if (presetKey === 'hallucination') {
      setCustomActive(false);
      setSubTab('brief');
      triggerScan();
      const p = weeklyAgentPrompts.find((x) => x.key === 'hallucination_test');
      if (p) sendAgentQuery(p.query, { ...defaultWeeklyData, reports: weeklyRawReports });
    } else if (presetKey === 'custom_edit') {
      setSubTab('custom');
      triggerScan('✍️ 写一句周报即可测 AI 自动排雷');
    }
  }, [presetKey, presetNonce]);

  const riskItems = useMemo(
    () => parsedResult.items.filter((i) => i.status === '待确认' || i.isDuplicate),
    [parsedResult.items]
  );
  const normalItems = useMemo(
    () => parsedResult.items.filter((i) => i.status !== '待确认' && !i.isDuplicate),
    [parsedResult.items]
  );

  const resolvedCount = riskItems.filter((i) => !!resolvedMap[i.id]).length;
  const allResolved = riskItems.length > 0 && resolvedCount === riskItems.length;

  const handleResolveSingle = (e, item) => {
    e.stopPropagation();
    if (resolvedMap[item.id] || sendingId === item.id) return;
    setSendingId(item.id);
    const delay = reduced ? 0 : 160;
    const t = setTimeout(() => {
      setSendingId(null);
      setResolvedMap((prev) => ({
        ...prev,
        [item.id]: item.isDuplicate ? '✓ 已拉通，省 2 人天' : '✓ 已企微催办',
      }));
      onToast(
        item.isDuplicate
          ? `已拉通 ${item.author} 合并开发同一套脚本`
          : `已发企微消息提醒 ${item.author} 核实「${item.name}」`
      );
    }, delay);
    timersRef.current.push(t);
  };

  const handleBatchResolve = (itemIds, label) => {
    setResolvedMap((prev) => {
      const next = { ...prev };
      itemIds.forEach((id) => {
        if (!next[id]) next[id] = '✓ 已由 AI 助手派发';
      });
      return next;
    });
    onToast(`✅ ${label}（左侧隐患状态已同步更新）`);
  };

  const applyCustomRun = () => {
    if (!customText.trim()) return;
    setCustomActive(true);
    setSubTab('brief');
    setResolvedMap({});
    const customReports = [
      { sourceId: 'CUSTOM', author: '自定义员工', team: null, rawText: customText.trim() },
    ];
    const customParsed = parseSampleReports(customReports);
    setExpandedQuoteId(customParsed.items[0]?.id || null);
    triggerScan('✨ 已按您输入的周报实时生成简报');
    const t = setTimeout(() => {
      sendAgentQuery('总结一下刚提交周报的完成项和隐患', {
        ...customParsed,
        reports: customReports,
      });
    }, reduced ? 20 : 380);
    timersRef.current.push(t);
  };

  return (
    <div className="wb-shell wk-simple-shell" data-workbench="weekly">
      {/* 极简 3 选 1 顶部切换条 */}
      <div className="wk-simple-bar">
        <div className="wk-scope-tabs wk-tabs-3" role="group" aria-label="切换周报视图">
          <button
            type="button"
            className={`wk-scope-tab${subTab === 'brief' ? ' active' : ''}`}
            onClick={() => setSubTab('brief')}
          >
            📊 AI 简报
          </button>
          <button
            type="button"
            className={`wk-scope-tab${subTab === 'raw' ? ' active' : ''}`}
            onClick={() => setSubTab('raw')}
          >
            📝 原始周报({parsedResult.reports.length})
          </button>
          <button
            type="button"
            className={`wk-scope-tab edit${subTab === 'custom' ? ' active' : ''}`}
            onClick={() => setSubTab('custom')}
          >
            ✍️ 写一句周报
          </button>
        </div>
        {customActive && (
          <button
            type="button"
            className="wb-chip-btn"
            onClick={() => {
              setCustomActive(false);
              setSubTab('brief');
              setResolvedMap({});
              triggerScan();
            }}
          >
            <RotateCcw size={12} /> 切回 5 人示例
          </button>
        )}
      </div>

      {subTab === 'raw' && (
        <div className="wk-raw-view">
          <div className="wk-raw-view-banner">
            <div>
              <strong>以前：每周翻几十段口水话，耗时数小时</strong>
              <p>以下为 5 位同事原始企微周报，点此看 AI 一键提炼排雷：</p>
            </div>
            <button
              type="button"
              className="wb-btn-primary"
              onClick={() => {
                setSubTab('brief');
                triggerScan();
              }}
            >
              <Sparkles size={14} /> AI 一键提炼排雷
            </button>
          </div>
          <div className="wk-raw-cards-grid">
            {parsedResult.reports.map((rep) => (
              <div key={rep.sourceId} className="wk-raw-plain-card">
                <div className="wk-raw-plain-head">
                  <strong>{rep.author}</strong>
                  <span>{rep.team || '未写部门'}</span>
                </div>
                <p>{rep.rawText}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'custom' && (
        <div className="wb-editor-box">
          <label className="wb-editor-label" htmlFor={`weekly-editor-${project.id}`}>
            输入几句周报（例：“完成了但还有报错”），测 AI 排雷：
          </label>
          <textarea
            id={`weekly-editor-${project.id}`}
            className="wb-textarea"
            rows={3}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
          />
          <div className="wb-editor-actions">
            <button type="button" className="wb-btn-primary" onClick={applyCustomRun}>
              <Sparkles size={13} /> 立即提炼并问助手
            </button>
          </div>
        </div>
      )}

      {subTab === 'brief' && (
        <div className="wk-simple-grid">
          {/* 左栏：大白话《本周 AI 重点提炼看板》 */}
          <div className="wk-brief-col">
            <div className="wk-section-header">
              <strong>🚨 重点隐患（{riskItems.length}）</strong>
              {riskItems.length > 0 && (
                <span className={`wk-closed-badge${allResolved ? ' done' : ''}`}>
                  {allResolved ? '🎉 已全部处理' : `已处理 ${resolvedCount}/${riskItems.length}`}
                </span>
              )}
            </div>

            {isScanning ? (
              <div className="wb-skeleton-list" aria-busy="true">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="wb-skeleton-card">
                    <div className="wb-skel-line w-65" />
                    <div className="wb-skel-line w-40" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="wk-card-stack">
                  {riskItems.length === 0 ? (
                    <div className="wb-empty">👏 当前周报无冲突或卡点隐患！</div>
                  ) : (
                    riskItems.map((item, idx) => {
                      const resolvedText = resolvedMap[item.id];
                      const isExpanded = expandedQuoteId === item.id;
                      return (
                        <motion.div
                          key={`${runSeed}-${item.id}`}
                          ref={(el) => {
                            itemRefs.current[item.id] = el;
                          }}
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: reduced ? 0 : idx * 0.05 }}
                          className={`wk-brief-card risk${resolvedText ? ' resolved' : ''}${isExpanded ? ' expanded' : ''}`}
                          onClick={() => setExpandedQuoteId(isExpanded ? null : item.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setExpandedQuoteId(isExpanded ? null : item.id);
                            }
                          }}
                        >
                          <div className="wk-brief-top">
                            <div className="wk-brief-badges">
                              <span className={`wk-tag ${resolvedText ? 'done' : item.isDuplicate ? 'dup' : 'warn'}`}>
                                {resolvedText || item.riskTag || '待确认'}
                              </span>
                              <span className="wk-person-tag">
                                {item.author} · {item.team || '未写部门'}
                              </span>
                            </div>
                            {!resolvedText && item.actionLabel && (
                              <button
                                type="button"
                                className="wb-inline-action-btn"
                                onClick={(e) => handleResolveSingle(e, item)}
                              >
                                {sendingId === item.id ? (
                                  <Loader2 size={12} className="wb-spin" />
                                ) : (
                                  item.actionLabel
                                )}
                              </button>
                            )}
                          </div>
                          <div className="wk-brief-title">{item.name}</div>
                          {item.riskNote && !resolvedText && (
                            <p className="wk-brief-note">{item.riskNote}</p>
                          )}
                          {isExpanded && (
                            <div className="wk-quote-drawer">
                              <span>💬 原话核对：</span>
                              <mark>{item.quote}</mark>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {normalItems.length > 0 && (
                  <div className="wk-normal-group">
                    <div className="wk-section-header normal">
                      <strong>✅ 正常推进与计划（{normalItems.length}）</strong>
                      <span>点条目看原话</span>
                    </div>
                    <div className="wk-normal-list">
                      {normalItems.map((item) => {
                        const isExpanded = expandedQuoteId === item.id;
                        return (
                          <button
                            key={item.id}
                            ref={(el) => {
                              itemRefs.current[item.id] = el;
                            }}
                            type="button"
                            className={`wk-normal-row${isExpanded ? ' expanded' : ''}`}
                            onClick={() => setExpandedQuoteId(isExpanded ? null : item.id)}
                          >
                            <div className="wk-normal-row-top">
                              <span
                                className={`wb-status-badge ${item.status === '已完成' ? 'ok' : 'plan'}`}
                              >
                                {item.status}
                              </span>
                              <strong>{item.name}</strong>
                              <small>{item.author}</small>
                            </div>
                            {isExpanded && (
                              <div className="wk-quote-drawer">
                                <span>💬 原话：</span>
                                <mark>{item.quote}</mark>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 右栏：大白话周报 AI 助手 */}
          <div className="wk-agent-col">
            <div className="wk-agent-head">
              <div className="wk-agent-title">
                <Sparkles size={15} />
                <strong>周报 AI 助手</strong>
              </div>
              <span className="wk-agent-guard-tag">不写绝不瞎猜</span>
            </div>

            <div className="wk-agent-presets" role="group" aria-label="快捷提问">
              {weeklyAgentPrompts.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`wk-agent-preset-btn${p.key === 'hallucination_test' ? ' guard' : ''}`}
                  onClick={() => sendAgentQuery(p.query)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="med-chat-log wk-chat-log" ref={chatLogRef} aria-live="polite">
              {messages.map((msg) => {
                const isStreamingThis = msg.id === streamingMsgId;
                const contentText = isStreamingThis ? streamingText : msg.text;
                return (
                  <motion.div
                    key={msg.id}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`med-msg ${msg.role === 'user' ? 'user' : 'assistant'}`}
                  >
                    <div
                      className={`med-bubble ${msg.route === 'guard_no_fabrication' ? 'wk-guard-bubble' : ''}`}
                    >
                      <p>
                        {contentText}
                        {isStreamingThis && <span className="wb-caret" aria-hidden="true" />}
                      </p>
                      {!isStreamingThis && (msg.highlightItemId || msg.suggestedAction) && (
                        <div className="wk-bubble-footer">
                          {msg.highlightItemId && (
                            <button
                              type="button"
                              className="wb-citation-chip"
                              onClick={() => focusItemQuote(msg.highlightItemId)}
                            >
                              🔍 定位员工原话
                            </button>
                          )}
                          {msg.suggestedAction && (
                            <button
                              type="button"
                              className="wk-bubble-action"
                              onClick={() =>
                                handleBatchResolve(
                                  msg.suggestedAction.itemIds,
                                  msg.suggestedAction.label
                                )
                              }
                            >
                              ⚡ {msg.suggestedAction.label}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isThinking && (
                <div className="med-msg assistant">
                  <div className="med-bubble med-typing-bubble" aria-label="AI 助手正在核对周报">
                    <span className="med-typing-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form
              className="med-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendAgentQuery(chatInput);
              }}
            >
              <input
                type="text"
                className="med-input wk-chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="问进度：如“张磊本周做了什么？”"
                aria-label="向周报 AI 助手提问"
              />
              <button
                type="submit"
                className="wb-btn-primary med-send-btn wk-send-btn"
                disabled={isThinking}
              >
                <Send size={14} /> 发送
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 2. 高校简章采集与选校工作台（大白话「10 秒智能选校 + 自动扒 PDF 填表」）
 * ============================================================================ */
function UniversityWorkbench({
  presetKey,
  presetNonce,
  replayNonce,
  onSyncRuntime,
  onToast,
}) {
  const reduced = useReducedMotion();
  const [subMode, setSubMode] = useState('matcher'); // 'matcher' | 'collector'
  const [gpaTier, setGpaTier] = useState('mid_100scale');
  const [maxAnnualBudget, setMaxAnnualBudget] = useState(50000);
  const [language, setLanguage] = useState('en');
  const [requireFullScholarship, setRequireFullScholarship] = useState(false);
  const [crossMajor, setCrossMajor] = useState(true);
  const [expandedUniId, setExpandedUniId] = useState(null);

  const [isMatching, setIsMatching] = useState(false);
  const [matchSeed, setMatchSeed] = useState(1);
  const [shortlistIds, setShortlistIds] = useState(['uni-b', 'uni-e']);
  const [reportState, setReportState] = useState('idle');

  const [collectorId, setCollectorId] = useState('dirty-missing-basis');
  const [dirtyFixed, setDirtyFixed] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [shakeGate, setShakeGate] = useState(false);

  const timersRef = useRef([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const matchResult = useMemo(
    () =>
      runUniversityMatcher({
        gpaTier,
        maxAnnualBudget,
        language,
        requireFullScholarship,
        crossMajor,
      }),
    [gpaTier, maxAnnualBudget, language, requireFullScholarship, crossMajor]
  );

  const ingestResult = useMemo(
    () => validateBrochureIngestion(collectorId, dirtyFixed),
    [collectorId, dirtyFixed]
  );

  const runMatcherAnimation = useCallback(() => {
    clearTimers();
    setMatchSeed((n) => n + 1);
    setReportState('idle');
    if (reduced) {
      setIsMatching(false);
      onSyncRuntime({
        running: false,
        statusText: '⚡ 人工 2 小时 → AI 秒配冲稳保',
        elapsedMs: 360,
      });
      return;
    }
    setIsMatching(true);
    onSyncRuntime({ running: true, statusText: '正在校验学费与硬门槛...', elapsedMs: 0 });
    const t = setTimeout(() => {
      setIsMatching(false);
      onSyncRuntime({
        running: false,
        statusText: '⚡ 人工 2 小时 → AI 秒配冲稳保',
        elapsedMs: 420,
      });
    }, 420);
    timersRef.current.push(t);
  }, [clearTimers, onSyncRuntime, reduced]);

  const runCollectorAnimation = useCallback(
    (sampleObj, fixedFlag) => {
      clearTimers();
      setShakeGate(false);
      const blocked = sampleObj.hasDirtyMissingBasis && !fixedFlag;
      if (reduced) {
        setIsIngesting(false);
        onSyncRuntime({
          running: false,
          statusText: blocked
            ? '⚠️ 简章缺收费口径，已拦截防错'
            : '⚡ 3 所/周 → 自动扒表 10+ 所/天',
          elapsedMs: 420,
        });
        return;
      }
      setIsIngesting(true);
      onSyncRuntime({ running: true, statusText: '正在解析官网 PDF 简章...', elapsedMs: 0 });
      const t = setTimeout(() => {
        setIsIngesting(false);
        if (blocked) setShakeGate(true);
        onSyncRuntime({
          running: false,
          statusText: blocked
            ? '⚠️ 简章缺收费口径，已拦截防错'
            : '⚡ 3 所/周 → 自动扒表 10+ 所/天',
          elapsedMs: 460,
        });
      }, 460);
      timersRef.current.push(t);
    },
    [clearTimers, onSyncRuntime, reduced]
  );

  useEffect(() => {
    if (subMode === 'matcher') runMatcherAnimation();
    else runCollectorAnimation(ingestResult.sample, dirtyFixed);
  }, [subMode, gpaTier, maxAnnualBudget, language, requireFullScholarship, crossMajor, collectorId, dirtyFixed, replayNonce]);

  useEffect(() => {
    if (!presetKey) return;
    if (presetKey === 'cross_budget') {
      setSubMode('matcher');
      setGpaTier('mid_100scale');
      setMaxAnnualBudget(50000);
      setLanguage('en');
      setRequireFullScholarship(false);
      setCrossMajor(true);
    } else if (presetKey === 'full_scholarship') {
      setSubMode('matcher');
      setGpaTier('good_4scale');
      setMaxAnnualBudget(50000);
      setLanguage('en');
      setRequireFullScholarship(true);
      setCrossMajor(false);
    } else if (presetKey === 'dirty_gate') {
      setSubMode('collector');
      setCollectorId('dirty-missing-basis');
      setDirtyFixed(false);
    }
  }, [presetKey, presetNonce]);

  const activeShortlist = useMemo(
    () => matchResult.matched.filter((m) => shortlistIds.includes(m.id)),
    [matchResult.matched, shortlistIds]
  );

  const toggleShortlist = (e, uniId) => {
    e.stopPropagation();
    setShortlistIds((prev) =>
      prev.includes(uniId) ? prev.filter((id) => id !== uniId) : [...prev, uniId]
    );
    setReportState('idle');
  };

  const autoFillShortlist = () => {
    const ids = matchResult.matched.slice(0, 3).map((m) => m.id);
    setShortlistIds(ids);
    onToast(`已智能挑出 ${ids.length} 所冲/稳/保高校加入方案单`);
  };

  const generateReport = () => {
    if (activeShortlist.length === 0) return;
    setReportState('generating');
    const t = setTimeout(() => {
      setReportState('ready');
      onToast(`已生成 ${activeShortlist.length} 所高校的《学生定校方案单》`);
    }, reduced ? 0 : 420);
    timersRef.current.push(t);
  };

  const copyReportSummary = async () => {
    const lines = [
      `【来华留学定校方案单】(${matchResult.gpaObj.label} · 预算≤¥${maxAnnualBudget === 999999 ? '不限' : maxAnnualBudget}/年)`,
      ...activeShortlist.map(
        (u, i) =>
          `${i + 1}. [${u.tierLabel}] ${u.schoolName} - ${u.program} | 折算 ¥${u.annualTuition}/年`
      ),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      onToast('已复制定校方案单到剪贴板');
    } catch {
      onToast('定校方案单已生成就绪');
    }
  };

  const friendlyYear = (status) => {
    if (status === 'fresh') return { text: '✅ 2026 最新简章', cls: 'fresh' };
    if (status === 'historical') return { text: '🕒 2025 简章预匹配', cls: 'hist' };
    return { text: '⚠️ 奖学金批次待核', cls: 'recheck' };
  };

  const friendlyElimReason = (r) =>
    r
      .replace('total_program ', '两年总价')
      .replace('academic_year ', '')
      .replace('封闭专业清单（仅限计算机本科），跨专业一票否决', '❌ 只收计算机本专业学生，跨专业申必被拒');

  return (
    <div className="wb-shell" data-workbench="university">
      <div className="wb-toolbar">
        <div className="wk-scope-tabs wk-tabs-2" role="group" aria-label="切换高校功能模式">
          <button
            type="button"
            className={`wk-scope-tab${subMode === 'matcher' ? ' active' : ''}`}
            onClick={() => setSubMode('matcher')}
          >
            🎯 智能选校
          </button>
          <button
            type="button"
            className={`wk-scope-tab${subMode === 'collector' ? ' active' : ''}`}
            onClick={() => setSubMode('collector')}
          >
            ⚡ PDF 采集入表
          </button>
        </div>
        <span className="wb-badge-mono wb-desktop-only">脱敏高校库示例 · 省掉外包团队</span>
      </div>

      {subMode === 'matcher' ? (
        <>
          <div className="uni-controls">
            <div className="uni-control-row">
              <div className="uni-control-group">
                <span className="uni-control-label">1. 成绩档位（不跨制换算）</span>
                <div className="wb-mini-filters">
                  {GPA_PROFILES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className={`wb-chip-btn${gpaTier === p.key ? ' active' : ''}`}
                      onClick={() => setGpaTier(p.key)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="uni-control-group">
                <span className="uni-control-label">2. 年学费预算</span>
                <div className="wb-mini-filters">
                  {BUDGET_OPTIONS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      className={`wb-chip-btn${maxAnnualBudget === b.value ? ' active' : ''}`}
                      onClick={() => setMaxAnnualBudget(b.value)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="uni-control-row">
              <div className="uni-control-group">
                <span className="uni-control-label">3. 授课语言</span>
                <div className="wb-mini-filters">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      className={`wb-chip-btn${language === l.value ? ' active' : ''}`}
                      onClick={() => setLanguage(l.value)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="uni-control-group">
                <span className="uni-control-label">4. 硬性条件</span>
                <div className="wb-mini-filters">
                  <button
                    type="button"
                    className={`wb-chip-btn${requireFullScholarship ? ' active' : ''}`}
                    onClick={() => setRequireFullScholarship((v) => !v)}
                  >
                    {requireFullScholarship ? '✓ 仅全额奖学金' : '不限奖学金'}
                  </button>
                  <button
                    type="button"
                    className={`wb-chip-btn${crossMajor ? ' active' : ''}`}
                    onClick={() => setCrossMajor((v) => !v)}
                  >
                    {crossMajor ? '✓ 跨专业申 CS' : '计算机本专业'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="wb-split-grid">
            {/* 左栏：AI 推荐冲稳保 */}
            <div className="wb-panel">
              <div className="wb-panel-head">
                <strong>✅ 推荐院校（{matchResult.matched.length} 所）</strong>
                {matchResult.matched.length > 0 && (
                  <button type="button" className="wb-chip-btn" onClick={autoFillShortlist}>
                    ✨ 一键配齐
                  </button>
                )}
              </div>
              <div className="wb-item-list">
                {isMatching ? (
                  <div className="wb-skeleton-list" aria-busy="true">
                    {[0, 1].map((idx) => (
                      <div key={idx} className="wb-skeleton-card">
                        <div className="wb-skel-line w-65" />
                        <div className="wb-skel-line w-40" />
                      </div>
                    ))}
                  </div>
                ) : matchResult.matched.length === 0 ? (
                  <div className="wb-empty">当前硬条件过严，试着放宽预算或取消全奖限制。</div>
                ) : (
                  matchResult.matched.map((uni, idx) => {
                    const yBadge = friendlyYear(uni.yearStatus);
                    const isExpanded = expandedUniId === uni.id;
                    const inList = shortlistIds.includes(uni.id);
                    return (
                      <motion.div
                        key={`${matchSeed}-${uni.id}`}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: reduced ? 0 : idx * 0.05 }}
                        className={`uni-card${inList ? ' shortlisted' : ''}`}
                      >
                        <button
                          type="button"
                          className="uni-card-btn"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedUniId(isExpanded ? null : uni.id)}
                        >
                          <div className="uni-card-top">
                            <span className={`uni-tier-tag ${uni.tierCode}`}>{uni.tierLabel}</span>
                            <span className="uni-school-name">{uni.schoolName}</span>
                            <span className="uni-school-badge">{uni.schoolBadge}</span>
                          </div>
                          <div className="uni-card-prog">{uni.program}</div>
                          <div className="uni-card-meta">
                            <span>
                              约 ¥{(uni.annualTuition / 10000).toFixed(1)}万/年（
                              {uni.tuitionBasis === 'total_program'
                                ? `2年总价 ¥${(uni.tuitionAmount / 10000).toFixed(1)}万`
                                : '按学年'}
                              ）
                            </span>
                            <span className={`uni-year-tag ${yBadge.cls}`}>{yBadge.text}</span>
                          </div>
                          {uni.conditionalReview && (
                            <p className="uni-conditional-tip">
                              <AlertTriangle size={12} /> 相关理工科酌情接收，建议核对成绩单
                            </p>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`uni-shortlist-btn${inList ? ' active' : ''}`}
                          onClick={(e) => toggleShortlist(e, uni.id)}
                        >
                          {inList ? (
                            <>
                              <Check size={12} /> 已入方案单
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> 加入方案单
                            </>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="uni-quote-box">
                            <small>简章原文（{uni.sourceFile}）：</small>
                            <p>{uni.brochureQuote}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 右栏：AI 自动避坑淘汰 */}
            <div className="wb-panel">
              <div className="wb-panel-head">
                <strong>🚫 已排除院校（{matchResult.eliminated.length} 所）</strong>
                <span className="wb-readonly-badge">硬门槛淘汰</span>
              </div>
              <div className="wb-item-list">
                {isMatching ? (
                  <div className="wb-skeleton-list" aria-busy="true">
                    {[0, 1].map((idx) => (
                      <div key={idx} className="wb-skeleton-card">
                        <div className="wb-skel-line w-65" />
                        <div className="wb-skel-line w-40" />
                      </div>
                    ))}
                  </div>
                ) : matchResult.eliminated.length === 0 ? (
                  <div className="wb-empty">当前条件下无淘汰院校。</div>
                ) : (
                  matchResult.eliminated.map((uni, idx) => (
                    <motion.div
                      key={`${matchSeed}-elim-${uni.id}`}
                      initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.22, delay: reduced ? 0 : idx * 0.04 }}
                      className="uni-elim-card"
                    >
                      <div className="uni-elim-head">
                        <span>{uni.schoolName}</span>
                        <span className="uni-elim-stamp">已排除</span>
                      </div>
                      <small className="uni-elim-prog">{uni.program}</small>
                      <ul className="uni-elim-reasons">
                        {uni.reasons.map((r) => (
                          <li key={r}>{friendlyElimReason(r)}</li>
                        ))}
                      </ul>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="uni-basket-bar">
            <div className="uni-basket-meta">
              <FileCheck2 size={16} />
              <span>
                已选 <b>{activeShortlist.length}</b> 所（冲{' '}
                {activeShortlist.filter((u) => u.tierCode === 'reach').length} / 稳{' '}
                {activeShortlist.filter((u) => u.tierCode === 'match').length} / 保{' '}
                {activeShortlist.filter((u) => u.tierCode === 'safety').length}）
              </span>
            </div>
            <button
              type="button"
              className="wb-btn-primary"
              disabled={activeShortlist.length === 0 || reportState === 'generating'}
              onClick={generateReport}
            >
              {reportState === 'generating' ? (
                <>
                  <Loader2 size={14} className="wb-spin" /> 正在生成...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> 生成选校方案单
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {reportState === 'ready' && activeShortlist.length > 0 && (
              <motion.div
                className="uni-report-preview"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="uni-report-head">
                  <div>
                    <span className="uni-report-kicker">✓ 37 项防错校验通过</span>
                    <h5>《来华留学定校方案单》</h5>
                  </div>
                  <button type="button" className="wb-btn-ghost" onClick={copyReportSummary}>
                    <Copy size={13} /> 复制摘要
                  </button>
                </div>
                <div className="uni-report-rows">
                  {activeShortlist.map((u) => (
                    <div key={u.id} className="uni-report-row">
                      <span className={`uni-tier-tag ${u.tierCode}`}>{u.tierLabel}</span>
                      <div className="uni-report-row-body">
                        <strong>
                          {u.schoolName} · {u.program}
                        </strong>
                        <small>
                          约 ¥{(u.annualTuition / 10000).toFixed(1)}万/年 · {u.sourceFile}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* 模式 2：大白话左右对照——自动扒官网 PDF 简章填表 + 防算错账拦截 */
        <div className="uni-collector-wrap">
          <div className="wb-mini-filters" role="group" aria-label="选择 PDF 简章示例">
            {[
              ['clean-pdf', '✅ 正常 PDF 简章'],
              ['dirty-missing-basis', '⚠️ 缺收费口径（测拦截）'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`wb-chip-btn${collectorId === id ? ' active' : ''}`}
                onClick={() => {
                  setCollectorId(id);
                  setDirtyFixed(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="wb-split-grid">
            <div className="wb-panel">
              <div className="wb-panel-head">
                <strong>1. 官网简章原文</strong>
              </div>
              <div className="wb-raw-card hit">
                <p className="wb-raw-text">{ingestResult.sample.rawSnippet}</p>
              </div>
              <p className="uni-ingest-explain">
                💡 以前人工+外包仅 3 所/周；现后台自动解析入表，日均 10+ 所。
              </p>
            </div>

            <div className={`wb-panel${shakeGate ? ' wb-shake-danger' : ''}`}>
              <div className="wb-panel-head">
                <strong>2. 自动提取入表</strong>
                <span className={`uni-gate-pill ${ingestResult.passed ? 'pass' : 'fail'}`}>
                  {isIngesting ? '解析中...' : ingestResult.passed ? '已安全入表' : '⚠️ 已拦截防错'}
                </span>
              </div>

              <div className="uni-table-preview">
                <div>
                  <span>高校名称</span>
                  <strong>{ingestResult.payload.school}</strong>
                </div>
                <div>
                  <span>招生专业</span>
                  <strong>{ingestResult.payload.program}</strong>
                </div>
                <div>
                  <span>标注学费</span>
                  <strong>¥{ingestResult.payload.tuition_amount?.toLocaleString()}</strong>
                </div>
                <div className={!ingestResult.passed ? 'err-row' : ''}>
                  <span>收费口径</span>
                  <strong>
                    {ingestResult.payload.tuition_basis === 'academic_year'
                      ? '按学年（¥36,000/年）'
                      : ingestResult.payload.tuition_basis === 'total_program'
                        ? '两年总价（折合 ¥24,000/年）'
                        : '❌ 未写明（防误算预算）'}
                  </strong>
                </div>
              </div>

              {!isIngesting && !ingestResult.passed && (
                <div className="uni-gate-fail">
                  <ShieldAlert size={18} />
                  <div>
                    <strong>已拦截脏数据入库</strong>
                    <p>原文仅写“48,000 元”未写明按年或总价，直接入库会算错预算，待人工核实。</p>
                    <button
                      type="button"
                      className="wb-btn-primary"
                      onClick={() => {
                        setDirtyFixed(true);
                        onToast('✓ 已核实补全为“两年总学费”，安全入表');
                      }}
                    >
                      <Check size={13} /> 补全为“两年总学费”并入表
                    </button>
                  </div>
                </div>
              )}

              {!isIngesting && ingestResult.passed && (
                <div className="uni-gate-ok">
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>字段完整无歧义，已备份并入库</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 3. 跨境医疗双语 RAG 客服（保留好评结构，精简顶部杂讯）
 * ============================================================================ */
function MedicalWorkbench({
  presetKey,
  presetNonce,
  replayNonce,
  onSyncRuntime,
  onToast,
}) {
  const reduced = useReducedMotion();
  const [lang, setLang] = useState('zh');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'init-1',
      role: 'assistant',
      text: '您好！我是跨境就医双语助手。点上方问题可测秒回与自动留资；问病情或报价会触发护栏并转人工。',
      route: 'rag_cited',
      faqId: 'K-008',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [shakeGuard, setShakeGuard] = useState(false);
  const [humanJoined, setHumanJoined] = useState(false);

  const [telemetry, setTelemetry] = useState({
    route: 'rag_cited',
    intentLabel: '等待提问 · 170 条双语知识库待命',
    guardrailTriggered: false,
    guardrailReason: null,
    matchedFaq: medicalFaqEntries[0],
  });
  const [lead, setLead] = useState({
    region: '',
    need: '',
    contact: '',
    handoffStatus: 'collecting',
  });
  const [updatedFields, setUpdatedFields] = useState([]);
  const [liveWidgetOpen, setLiveWidgetOpen] = useState(false);

  const chatLogRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, isTyping, streamingText]);

  const sendMessageText = useCallback(
    (textToSend, targetLang = lang) => {
      const clean = String(textToSend || '').trim();
      if (!clean || isTyping) return;
      clearTimers();
      setShakeGuard(false);

      const userMsg = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: clean,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');

      const result = processMedicalTurn(clean, lead, targetLang);
      const botId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (reduced) {
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'assistant',
            text: result.reply,
            route: result.route,
            faqId: result.matchedFaq?.id || null,
          },
        ]);
        setLead(result.lead);
        setUpdatedFields(result.updatedFields);
        setTelemetry({
          route: result.route,
          intentLabel: result.intentLabel,
          guardrailTriggered: result.guardrailTriggered,
          guardrailReason: result.guardrailReason,
          matchedFaq: result.matchedFaq || telemetry.matchedFaq,
        });
        return;
      }

      setIsTyping(true);
      onSyncRuntime({ running: true, statusText: '正在检索双语知识库并检查医疗安全护栏...' });

      const tReply = setTimeout(() => {
        setIsTyping(false);
        setLead(result.lead);
        setUpdatedFields(result.updatedFields);
        setTelemetry({
          route: result.route,
          intentLabel: result.intentLabel,
          guardrailTriggered: result.guardrailTriggered,
          guardrailReason: result.guardrailReason,
          matchedFaq: result.matchedFaq || telemetry.matchedFaq,
        });
        if (result.guardrailTriggered) setShakeGuard(true);

        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'assistant',
            text: result.reply,
            route: result.route,
            faqId: result.matchedFaq?.id || null,
          },
        ]);

        setStreamingMsgId(botId);
        setStreamingText('');
        let idx = 0;
        const streamTimer = setInterval(() => {
          idx += 4;
          if (idx >= result.reply.length) {
            setStreamingMsgId(null);
            setStreamingText('');
            clearInterval(streamTimer);
            onSyncRuntime({
              running: false,
              statusText: result.guardrailTriggered
                ? '🛡️ 触发医疗红线 · 已转人工'
                : '⚡ 7×24 双语秒回 · 自动收名片',
              elapsedMs: 520,
            });
          } else {
            setStreamingText(result.reply.slice(0, idx));
          }
        }, 14);
        timersRef.current.push(streamTimer);
      }, 340);
      timersRef.current.push(tReply);
    },
    [clearTimers, isTyping, lang, lead, onSyncRuntime, reduced, telemetry.matchedFaq]
  );

  useEffect(() => {
    onSyncRuntime({
      running: false,
      statusText: '⚡ 7×24 双语秒回 · 自动收名片',
      elapsedMs: 120,
    });
  }, [replayNonce]);

  useEffect(() => {
    if (!presetKey) return;
    const presetMap = {
      rag_visa: 'prep_visa',
      lead_extract: 'lead_info',
      risk_guard: 'risk_diagnosis',
    };
    const promptObj = medicalPresetPrompts.find((p) => p.key === presetMap[presetKey]);
    if (promptObj) {
      const text = lang === 'en' ? promptObj.textEn : promptObj.textZh;
      sendMessageText(text, lang);
    }
  }, [presetKey, presetNonce]);

  const handleHumanTakeover = () => {
    if (humanJoined) return;
    setHumanJoined(true);
    const regionPart = lead.region || '海外地区';
    const needPart = lead.need || '跨境就医与陪诊咨询';
    const contactPart = lead.contact ? `，已关联您的联系方式 ${lead.contact}` : '';
    setMessages((prev) => [
      ...prev,
      {
        id: `human-${Date.now()}`,
        role: 'assistant',
        route: 'human_agent_joined',
        text:
          lang === 'en'
            ? `Hi, this is Sarah (Medical Coordinator). I received your summary for ${regionPart} (${needPart})${contactPart} and will send an official hospital schedule shortly.`
            : `您好，我是人工双语医疗顾问 Sarah。我已收到 AI 交接的客户名片：来自「${regionPart}」，咨询「${needPart}」${contactPart}。具体病情与费用核算由我核对医院后为您正式回复。`,
      },
    ]);
    onToast('🟢 人工医疗顾问 Sarah 已接手会话');
  };

  const resetChat = () => {
    clearTimers();
    setIsTyping(false);
    setStreamingMsgId(null);
    setShakeGuard(false);
    setHumanJoined(false);
    setMessages([
      {
        id: 'reset-1',
        role: 'assistant',
        text:
          lang === 'en'
            ? 'Chat reset. Ask about booking/visa, share your email for lead capture, or test our medical guardrail.'
            : '对话已重置。您可以测试预约翻译秒回、输入地区邮箱生成名片，或故意问病情/报价测试护栏拦截。',
        route: 'rag_cited',
        faqId: 'K-008',
      },
    ]);
    setLead({ region: '', need: '', contact: '', handoffStatus: 'collecting' });
    setUpdatedFields([]);
    setTelemetry({
      route: 'rag_cited',
      intentLabel: '等待提问 · 170 条双语知识库待命',
      guardrailTriggered: false,
      guardrailReason: null,
      matchedFaq: medicalFaqEntries[0],
    });
  };

  const leadScore = [lead.region, lead.need, lead.contact].filter(Boolean).length;

  const handoffTextMap = {
    collecting: 'AI 接待中 · 自动收名片',
    lead_ready: '✅ 名片已收齐 · 推送顾问',
    human_normal: '🟡 超出知识库 · 转人工核实',
    human_priority: '🔴 涉及病情/报价 · 强制转人工',
  };

  return (
    <div className="wb-shell" data-workbench="medical">
      <div className="wb-toolbar med-toolbar">
        <div className="wk-scope-tabs" role="group" aria-label="切换对话语言">
          <button
            type="button"
            className={`wk-scope-tab${lang === 'zh' ? ' active' : ''}`}
            onClick={() => setLang('zh')}
          >
            中文
          </button>
          <button
            type="button"
            className={`wk-scope-tab${lang === 'en' ? ' active' : ''}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
        </div>
        <div className="med-toolbar-right">
          <span className="wb-badge-mono wb-desktop-only">🔒 本地演示 · 不保存个人隐私</span>
          <button type="button" className="wb-btn-ghost" onClick={resetChat}>
            <RotateCcw size={13} /> 重置
          </button>
        </div>
      </div>

      <div className="med-presets" role="group" aria-label="快捷测试问题">
        {medicalPresetPrompts.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`med-preset-btn${p.key.startsWith('risk_') ? ' risk' : ''}`}
            onClick={() => sendMessageText(lang === 'en' ? p.textEn : p.textZh)}
          >
            {lang === 'en' ? p.labelEn : p.labelZh}
          </button>
        ))}
      </div>

      <div className="med-grid">
        <div className="med-chat-panel">
          <div className="med-chat-log" ref={chatLogRef} aria-live="polite">
            {messages.map((msg) => {
              const isStreamingThis = msg.id === streamingMsgId;
              const contentText = isStreamingThis ? streamingText : msg.text;
              return (
                <motion.div
                  key={msg.id}
                  initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`med-msg ${msg.role}`}
                >
                  <div className={`med-bubble ${msg.route || ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="med-bubble-head">
                        <span>
                          {msg.route === 'human_agent_joined'
                            ? '👩‍⚕️ 人工医疗顾问 · Sarah'
                            : msg.route === 'human_handoff_guardrail'
                              ? '🛡️ 安全护栏已拦截'
                              : msg.route === 'out_of_kb_handoff'
                                ? '👤 转人工核实'
                                : '📚 依据知识库回复'}
                        </span>
                      </div>
                    )}
                    <p>
                      {contentText}
                      {isStreamingThis && <span className="wb-caret" aria-hidden="true" />}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            {isTyping && (
              <div className="med-msg assistant">
                <div className="med-bubble med-typing-bubble" aria-label="助手正在回复">
                  <span className="med-typing-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            )}
          </div>

          <form
            className="med-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessageText(inputText);
            }}
          >
            <input
              type="text"
              className="med-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Ask a question or test guardrail...'
                  : '输入问题，或留地区与邮箱测试...'
              }
              aria-label="输入模拟医疗咨询内容"
            />
            <button type="submit" className="wb-btn-primary med-send-btn" disabled={isTyping}>
              <Send size={14} /> 发送
            </button>
          </form>
        </div>

        <div className="med-telemetry-col">
          <div
            className={`med-guard-card ${telemetry.guardrailTriggered ? 'danger' : 'safe'}${shakeGuard ? ' wb-shake-danger' : ''}`}
          >
            <div className="med-guard-head">
              {telemetry.guardrailTriggered ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
              <strong>
                {telemetry.guardrailTriggered ? '高风险拦截（已转人工）' : '安全护栏就绪（不乱答医疗）'}
              </strong>
            </div>
            <p className="med-intent-line">{telemetry.intentLabel}</p>
            {telemetry.guardrailReason && (
              <p className="med-guard-reason">{telemetry.guardrailReason}</p>
            )}
          </div>

          <div className="med-lead-card" aria-label="自动提取的结构化客户名片">
            <div className="med-lead-head">
              <UserCheck size={15} />
              <strong>客户名片（已收齐 {leadScore}/3）</strong>
            </div>
            <div className="wb-progress-track med-lead-progress" aria-hidden="true">
              <div
                className="wb-progress-fill"
                style={{ width: `${Math.round((leadScore / 3) * 100)}%` }}
              />
            </div>
            <dl className="med-lead-fields">
              <div className={updatedFields.includes('region') ? 'updated' : ''}>
                <dt>所在地区</dt>
                <dd>{lead.region || '待提取（国家/城市）'}</dd>
              </div>
              <div className={updatedFields.includes('need') ? 'updated' : ''}>
                <dt>就医需求</dt>
                <dd>{lead.need || '自动识别'}</dd>
              </div>
              <div className={updatedFields.includes('contact') ? 'updated' : ''}>
                <dt>联系方式</dt>
                <dd>{lead.contact || '待提取（邮箱/微信）'}</dd>
              </div>
              <div>
                <dt>当前状态</dt>
                <dd
                  className={`med-handoff-status ${humanJoined ? 'lead_ready' : lead.handoffStatus}`}
                >
                  {humanJoined
                    ? '🟢 人工顾问 Sarah 已接手'
                    : handoffTextMap[lead.handoffStatus]}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className={`med-takeover-btn${humanJoined ? ' joined' : ''}`}
              disabled={humanJoined}
              onClick={handleHumanTakeover}
            >
              {humanJoined ? (
                <>
                  <CheckCircle2 size={14} /> 人工顾问已接手
                </>
              ) : (
                <>
                  <UserCheck size={14} /> 模拟人工顾问接手
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="med-live-toggle-wrap">
        <button
          type="button"
          className="med-live-toggle-btn"
          aria-expanded={liveWidgetOpen}
          onClick={() => setLiveWidgetOpen((v) => !v)}
        >
          <span>
            <MessageSquare size={14} /> {liveWidgetOpen ? '收起真实在线客服挂件' : '体验真实在线客服挂件'}
          </span>
          {liveWidgetOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {liveWidgetOpen && <ChatbotDemo />}
      </div>
    </div>
  );
}

/* ============================================================================
 * 对外主组件：CaseExperience（极简提效实测壳，去掉晦涩步骤条与 JSON 框）
 * ============================================================================ */
export function CaseExperience({ project, activePreset = null }) {
  const demo = caseDemos[project.id];
  const reduced = useReducedMotion();
  const [view, setView] = useState('workflow');
  const [replayNonce, setReplayNonce] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [runtime, setRuntime] = useState({
    running: false,
    statusText: '就绪',
    elapsedMs: 0,
  });

  const toastTimerRef = useRef(null);
  const instanceId = useId();
  const tabId = `demo-${project.id}-${instanceId}`;
  const workflowRef = useRef(null);
  const coverRef = useRef(null);

  const presetKey = typeof activePreset === 'string' ? activePreset : activePreset?.key || null;
  const presetNonce = typeof activePreset === 'object' ? activePreset?.nonce || 0 : 0;

  useEffect(() => {
    if (presetKey) setView('workflow');
  }, [presetKey, presetNonce]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  const syncRuntime = useCallback((patch) => {
    setRuntime((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleTabKey = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 'workflow'
        : event.key === 'End'
          ? 'cover'
          : view === 'workflow'
            ? 'cover'
            : 'workflow';
    setView(next);
    (next === 'workflow' ? workflowRef : coverRef).current?.focus();
  };

  return (
    <section className={`case-experience theme-${demo.theme}`} aria-label={`${project.title}展示演示`}>
      <div className="demo-heading">
        <h3>{demo.previewTitle}</h3>
      </div>

      <div className="demo-tabs" role="tablist" aria-label="案例展示方式" onKeyDown={handleTabKey}>
        <button
          ref={workflowRef}
          type="button"
          role="tab"
          id={`${tabId}-workflow`}
          aria-controls={`${tabId}-workflow-panel`}
          aria-selected={view === 'workflow'}
          tabIndex={view === 'workflow' ? 0 : -1}
          onClick={() => setView('workflow')}
        >
          <Play size={13} /> 交互体验
        </button>
        <button
          ref={coverRef}
          type="button"
          role="tab"
          id={`${tabId}-cover`}
          aria-controls={`${tabId}-cover-panel`}
          aria-selected={view === 'cover'}
          tabIndex={view === 'cover' ? 0 : -1}
          onClick={() => setView('cover')}
        >
          <Layers size={14} /> 界面展示
        </button>
      </div>

      <div
        role="tabpanel"
        id={`${tabId}-cover-panel`}
        aria-labelledby={`${tabId}-cover`}
        hidden={view !== 'cover'}
        tabIndex={0}
      >
        <figure className="demo-cover">
          <img src={demo.image} alt={demo.imageAlt} width="1536" height="1024" />
          <figcaption>{demo.imageNote}</figcaption>
        </figure>
      </div>

      <div
        role="tabpanel"
        id={`${tabId}-workflow-panel`}
        aria-labelledby={`${tabId}-workflow`}
        hidden={view !== 'workflow'}
        tabIndex={0}
      >
        <div className="wb-app-frame">
          <div className="wb-app-bar">
            <div className="wb-app-bar-left">
              <span className="wb-traffic-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className={`wb-status-dot${runtime.running ? ' running' : ' ready'}`} />
              <span className="wb-status-text">{runtime.statusText}</span>
            </div>
            <div className="wb-app-bar-right">
              <button
                type="button"
                className="wb-replay-btn"
                aria-label="重新演示"
                onClick={() => setReplayNonce((n) => n + 1)}
              >
                <RotateCcw size={12} className={runtime.running ? 'wb-spin' : ''} />
                <span className="wb-replay-label-full">重新演示</span>
                <span className="wb-replay-label-short">重演</span>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {toastMsg && (
              <motion.div
                className="wb-toast"
                role="status"
                initial={reduced ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
              >
                <CheckCircle2 size={14} />
                <span>{toastMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {project.id === 'weekly-intelligence' && (
            <WeeklyWorkbench
              project={project}
              presetKey={presetKey}
              presetNonce={presetNonce}
              replayNonce={replayNonce}
              onSyncRuntime={syncRuntime}
              onToast={showToast}
            />
          )}
          {project.id === 'university-agent' && (
            <UniversityWorkbench
              presetKey={presetKey}
              presetNonce={presetNonce}
              replayNonce={replayNonce}
              onSyncRuntime={syncRuntime}
              onToast={showToast}
            />
          )}
          {project.id === 'medical-concierge' && (
            <MedicalWorkbench
              presetKey={presetKey}
              presetNonce={presetNonce}
              replayNonce={replayNonce}
              onSyncRuntime={syncRuntime}
              onToast={showToast}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export function CaseDialog({ project, activePreset = null, onClose }) {
  const dialogRef = useRef(null);
  const closeDialog = () => {
    dialogRef.current.close();
    onClose();
  };
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
    <dialog
      className="case-dialog"
      ref={dialogRef}
      aria-labelledby="case-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target !== dialogRef.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          closeDialog();
        }
      }}
    >
      <div className="dialog-top">
        <div className="dialog-top-title">
          <span>交互演示</span>
          <h2 id="case-dialog-title">{project.title}</h2>
        </div>
        <button type="button" autoFocus aria-label="关闭案例预览" onClick={closeDialog}>
          <X size={20} />
        </button>
      </div>
      <div className="dialog-scroll-body">
        <CaseExperience project={project} activePreset={activePreset} />
        <div className="dialog-bottom">
          <p>本地脱敏演示数据，不保存个人隐私。</p>
          <a className="button-primary" href={`portfolio.html#${project.id}`}>
            阅读完整案例 <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </dialog>
  );
}
