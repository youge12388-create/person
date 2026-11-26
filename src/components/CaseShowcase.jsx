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
  Database,
  FileCheck2,
  Layers,
  Link2,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  X,
} from 'lucide-react';
import { caseDemos } from '../caseDemos.js';
import {
  askWeeklyAgent,
  parseSampleReports,
  weeklyAgentPrompts,
  weeklySamples,
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
        <Play size={14} /> 实操交互沙盒
      </span>
    </motion.button>
  );
}

/* 通用流式打字 Hook */
function useTypewriter(fullText, triggerKey, speedMs = 16) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(fullText);

  useEffect(() => {
    if (reduced || !fullText) {
      setDisplayed(fullText);
      return undefined;
    }
    setDisplayed('');
    let cursor = 0;
    const timer = setInterval(() => {
      cursor += 3;
      if (cursor >= fullText.length) {
        setDisplayed(fullText);
        clearInterval(timer);
      } else {
        setDisplayed(fullText.slice(0, cursor));
      }
    }, speedMs);
    return () => clearInterval(timer);
  }, [fullText, triggerKey, reduced, speedMs]);

  return displayed;
}

/* ============================================================================
 * 1. 企业微信周报智能分析驾驶舱（清爽双栏排版 + 周报 Agent 实时对话与防脑补核查）
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
  const [viewScope, setViewScope] = useState('all'); // 'all' | '研发' | '产品交付'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | '待确认'
  const [editing, setEditing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customActive, setCustomActive] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [activeReportId, setActiveReportId] = useState('W-201');

  // 运行动效 & 处置闭环状态
  const [isScanning, setIsScanning] = useState(!reduced);
  const [runSeed, setRunSeed] = useState(1);
  const [flashKey, setFlashKey] = useState(0);
  const [resolvedMap, setResolvedMap] = useState({});
  const [sendingId, setSendingId] = useState(null);

  // 周报 Agent 对话流状态
  const [chatInput, setChatInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'wk-init-1',
      role: 'agent',
      route: 'agent_alert',
      text: '已同步本周 5 份企微周报（W-201 ~ W-205）。初步巡检发现：研发组与交付组疑似重复开发「订单导出脚本」，且有 3 项待确认/卡点（含 1 句前后状态矛盾、1 句未写明负责人）。您可以直接点击下方快捷问题，或像微信聊天一样向我提问。',
      citations: [
        { sourceId: 'W-201', author: '张工 · 研发组', name: '完成客户订单导出脚本开发', quote: '研发组：本周完成客户订单导出脚本开发，已接入测试环境', itemId: 'W-201-1' },
        { sourceId: 'W-204', author: '陈工 · 研发组', name: '订单同步已经完成', quote: '研发组：订单同步已经完成。补充：订单同步异常重试尚未通过验收', itemId: 'W-204-1' },
      ],
      suggestedAction: null,
    },
  ]);

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
  }, [messages, isAgentThinking, streamingText]);

  const baseSample = weeklySamples[0];

  const parsedResult = useMemo(() => {
    if (!customActive) {
      return {
        items: baseSample.items,
        duplicatePairs: baseSample.duplicatePairs,
        reports: baseSample.reports,
      };
    }
    const reports = [
      {
        sourceId: 'W-CUSTOM',
        author: '现场录入周报',
        rawText: customText.trim() || '（输入为空）',
      },
    ];
    const { items, duplicatePairs } = parseSampleReports(reports);
    return { items, duplicatePairs, reports };
  }, [baseSample, customActive, customText]);

  const triggerScanRun = useCallback(
    (targetStage = 4, customLabel = '正在扫描企微周报并提取工作项...') => {
      clearTimers();
      setRunSeed((n) => n + 1);
      if (reduced) {
        setIsScanning(false);
        onSyncRuntime({
          running: false,
          stageIndex: targetStage,
          statusText: '已就绪 · 左栏核查原文 / 右栏向周报 Agent 提问',
          elapsedMs: 560,
        });
        return;
      }

      setIsScanning(true);
      onSyncRuntime({
        running: true,
        stageIndex: 0,
        statusText: customLabel,
        elapsedMs: 0,
      });

      const steps = [
        { delay: 160, stage: 1, text: 'AI 结构化拆解事项（缺失留空、矛盾标疑）...' },
        { delay: 360, stage: 2, text: '建立只读原文与来源编号映射...' },
        { delay: 560, stage: 3, text: '跨部门查重与卡点索引构建完成...' },
        {
          delay: 720,
          stage: targetStage,
          text: '已就绪 · 左栏看事项溯源 / 右栏直接问周报 Agent',
          done: true,
        },
      ];

      steps.forEach((s) => {
        const t = setTimeout(() => {
          if (s.done) setIsScanning(false);
          onSyncRuntime({
            running: !s.done,
            stageIndex: s.stage,
            statusText: s.text,
            elapsedMs: s.delay,
          });
        }, s.delay);
        timersRef.current.push(t);
      });
    },
    [clearTimers, onSyncRuntime, reduced]
  );

  // 发送周报 Agent 对话消息（三点等待 + 流式输出 + 联动左侧高亮）
  const sendWeeklyAgentQuery = useCallback(
    (rawQuery, overrideResult = null) => {
      const q = String(rawQuery || '').trim();
      if (!q || isAgentThinking) return;
      const resultPool = overrideResult || parsedResult;

      const userMsg = {
        id: `wk-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'user',
        text: q,
      };
      setMessages((prev) => [...prev, userMsg]);
      setChatInput('');

      const res = askWeeklyAgent(
        q,
        resultPool.items,
        resultPool.reports,
        resultPool.duplicatePairs
      );
      const botId = `wk-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const syncFirstCitation = () => {
        const firstCite = res.citations?.[0];
        if (firstCite) {
          setSelectedItemId(firstCite.itemId);
          setActiveReportId(firstCite.sourceId);
          setFlashKey((k) => k + 1);
        }
      };

      if (reduced) {
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'agent',
            route: res.route,
            text: res.answer,
            citations: res.citations,
            suggestedAction: res.suggestedAction,
          },
        ]);
        syncFirstCitation();
        return;
      }

      setIsAgentThinking(true);
      onSyncRuntime({
        running: true,
        stageIndex: 4,
        statusText: '周报 Agent 正在检索原文并校验事实边界...',
      });

      const tThink = setTimeout(() => {
        setIsAgentThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'agent',
            route: res.route,
            text: res.answer,
            citations: res.citations,
            suggestedAction: res.suggestedAction,
          },
        ]);
        syncFirstCitation();

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
              stageIndex: 4,
              statusText:
                res.route === 'guard_no_fabrication'
                  ? '🛡️ 触发防脑补约束 · 已引用原文拒绝编造'
                  : '✓ 周报 Agent 已回复并关联原文溯源',
              elapsedMs: 520,
            });
          } else {
            setStreamingText(res.answer.slice(0, idx));
          }
        }, 14);
        timersRef.current.push(streamTimer);
      }, 340);

      timersRef.current.push(tThink);
    },
    [isAgentThinking, onSyncRuntime, parsedResult, reduced]
  );

  // 首次挂载 & 外部重播触发
  useEffect(() => {
    triggerScanRun(4);
  }, [replayNonce]);

  // 响应外部一键试玩预设
  useEffect(() => {
    if (!presetKey) return;
    setResolvedMap({});
    setViewScope('all');
    setStatusFilter('all');
    if (presetKey === 'team_dups') {
      setCustomActive(false);
      setEditing(false);
      triggerScanRun(4, '正在扫描 40 人团队周报...');
      const p = weeklyAgentPrompts.find((x) => x.key === 'dups');
      if (p) sendWeeklyAgentQuery(p.query, baseSample);
    } else if (presetKey === 'hallucination') {
      setCustomActive(false);
      setEditing(false);
      triggerScanRun(4, '正在测试防脑补边界约束...');
      const p = weeklyAgentPrompts.find((x) => x.key === 'hallucination_test');
      if (p) sendWeeklyAgentQuery(p.query, baseSample);
    } else if (presetKey === 'custom_edit') {
      const starter =
        '研发组：支付对账脚本已完成。补充：对账脚本在并发场景下仍有报错，尚未通过验收。\n产品组：周报导出字段待确认。\n本周推进了客户历史账单补录，目前还有问题需要处理。';
      setCustomText(starter);
      setCustomActive(true);
      setEditing(true);
      triggerScanRun(4, '正在实时解析新录入周报...');
    }
  }, [presetKey, presetNonce]);

  const visibleItems = useMemo(() => {
    let list = parsedResult.items;
    if (viewScope === '研发') {
      list = list.filter((i) => i.team && i.team.includes('研发'));
    } else if (viewScope === '产品交付') {
      list = list.filter(
        (i) => i.team && (i.team.includes('产品') || i.team.includes('交付'))
      );
    }
    if (statusFilter === '待确认') {
      list = list.filter((i) => i.status === '待确认');
    }
    return list;
  }, [parsedResult.items, viewScope, statusFilter]);

  const selectedItem = useMemo(
    () =>
      parsedResult.items.find((i) => i.id === selectedItemId) ||
      visibleItems[0] ||
      parsedResult.items[0] ||
      null,
    [parsedResult.items, visibleItems, selectedItemId]
  );

  const activeReport = useMemo(
    () =>
      parsedResult.reports.find((r) => r.sourceId === (activeReportId || selectedItem?.sourceId)) ||
      parsedResult.reports[0],
    [parsedResult.reports, activeReportId, selectedItem?.sourceId]
  );

  // 待处置管理异常闭环统计
  const actionableItems = useMemo(
    () => parsedResult.items.filter((i) => i.status === '待确认' || i.isDuplicate),
    [parsedResult.items]
  );
  const resolvedCount = actionableItems.filter((i) => !!resolvedMap[i.id]).length;
  const allResolved = actionableItems.length > 0 && resolvedCount === actionableItems.length;

  useEffect(() => {
    onSyncRuntime({
      payload: {
        mode: customActive ? 'W-CUSTOM' : 'team-overview',
        scope_filter: viewScope,
        total_items: parsedResult.items.length,
        needs_confirmation: parsedResult.items.filter((i) => i.status === '待确认').length,
        cross_team_duplicates: parsedResult.duplicatePairs.length,
        resolved_actions: `${resolvedCount}/${actionableItems.length}`,
        active_source_id: activeReport?.sourceId || null,
        agent_messages_count: messages.length,
        inferred_missing_fields: false,
      },
    });
  }, [customActive, viewScope, parsedResult, resolvedCount, actionableItems.length, activeReport?.sourceId, messages.length]);

  const openEditor = () => {
    if (!editing && !customText) {
      setCustomText(
        '研发组：支付对账脚本已完成。补充：对账脚本在并发场景下仍有报错，尚未通过验收。\n产品组：周报导出字段待确认。\n本周推进了客户历史账单补录，目前还有问题需要处理。'
      );
    }
    setEditing((v) => !v);
  };

  const applyCustomParse = () => {
    if (!customText.trim()) return;
    setCustomActive(true);
    setViewScope('all');
    setStatusFilter('all');
    setSelectedItemId(null);
    setActiveReportId('W-CUSTOM');
    setResolvedMap({});

    const customReports = [
      { sourceId: 'W-CUSTOM', author: '现场录入周报', rawText: customText.trim() },
    ];
    const customParsed = parseSampleReports(customReports);
    triggerScanRun(4, '正在拆解新录入周报并通知 Agent 诊断...');
    const t = setTimeout(() => {
      sendWeeklyAgentQuery('汇总一下新录入周报的完成项、待确认与卡点问题', {
        ...customParsed,
        reports: customReports,
      });
    }, reduced ? 20 : 420);
    timersRef.current.push(t);
  };

  const resetToTeamSample = () => {
    setCustomActive(false);
    setEditing(false);
    setViewScope('all');
    setStatusFilter('all');
    setSelectedItemId(null);
    setActiveReportId('W-201');
    setResolvedMap({});
    triggerScanRun(4);
  };

  const selectAndHighlightItem = (item) => {
    setSelectedItemId(item.id);
    setActiveReportId(item.sourceId);
    setFlashKey((k) => k + 1);
  };

  const handleResolveSingle = (e, item) => {
    e.stopPropagation();
    if (resolvedMap[item.id] || sendingId === item.id) return;
    setSendingId(item.id);
    const isDup = item.isDuplicate && item.status !== '待确认';
    const delay = reduced ? 0 : 160;
    const t = setTimeout(() => {
      setSendingId(null);
      setResolvedMap((prev) => ({
        ...prev,
        [item.id]: isDup ? '✓ 已合并排期' : '✓ 已派发核实',
      }));
      onToast(
        isDup
          ? `已拉通「${item.team ?? item.sourceId}」发起重复脚本合并对齐`
          : `已通过企微向 ${item.author || item.team || '提交人'} 发送「${item.name}」原句核实卡`
      );
    }, delay);
    timersRef.current.push(t);
  };

  const handleBatchResolve = (itemIds, label) => {
    setResolvedMap((prev) => {
      const next = { ...prev };
      itemIds.forEach((id) => {
        if (!next[id]) next[id] = '✓ 已由 Agent 派发';
      });
      return next;
    });
    onToast(`⚡ ${label}（已同步更新左侧事项闭环状态）`);
  };

  const renderHighlightedText = (rawText, quote) => {
    if (!quote || !rawText.includes(quote)) return rawText;
    const idx = rawText.indexOf(quote);
    return (
      <>
        {rawText.slice(0, idx)}
        <mark key={flashKey} className="wb-mark-pulse">
          {quote}
        </mark>
        {rawText.slice(idx + quote.length)}
      </>
    );
  };

  const pendingCount = parsedResult.items.filter((i) => i.status === '待确认').length;

  return (
    <div className="wb-shell wk-shell" data-workbench="weekly">
      {/* 极简单行工具栏 */}
      <div className="wk-topbar">
        <div className="wk-scope-tabs" role="group" aria-label="切换周报部门或录入">
          {[
            ['all', customActive ? '自定义录入' : '全部门 (5人)'],
            ['研发', '研发组'],
            ['产品交付', '产品与交付'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`wk-scope-tab${!editing && viewScope === key ? ' active' : ''}`}
              disabled={customActive && key !== 'all'}
              onClick={() => {
                setViewScope(key);
                setEditing(false);
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={`wk-scope-tab edit${editing ? ' active' : ''}`}
            onClick={openEditor}
          >
            ✍️ {editing ? '收起录入' : '录入周报实测'}
          </button>
        </div>

        <div className="wk-top-status">
          <button
            type="button"
            className={`wb-chip-btn${statusFilter === 'all' ? ' active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            全部 {parsedResult.items.length}
          </button>
          <button
            type="button"
            className={`wb-chip-btn${statusFilter === '待确认' ? ' active' : ''}`}
            onClick={() => setStatusFilter('待确认')}
          >
            待确认 {pendingCount}
          </button>
          {actionableItems.length > 0 && (
            <span className={`wk-closed-badge${allResolved ? ' done' : ''}`}>
              {allResolved ? '🎉 异常已清零' : `已闭环 ${resolvedCount}/${actionableItems.length}`}
            </span>
          )}
        </div>
      </div>

      {editing && (
        <div className="wb-editor-box">
          <label className="wb-editor-label" htmlFor={`weekly-editor-${project.id}`}>
            输入或修改周报原文（提交后左栏实时拆解，右侧周报 Agent 自动生成诊断）：
          </label>
          <textarea
            id={`weekly-editor-${project.id}`}
            className="wb-textarea"
            rows={3}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="例如：研发组：订单同步已完成。补充：订单同步仍有报错未通过验收。"
          />
          <div className="wb-editor-actions">
            <button type="button" className="wb-btn-primary" onClick={applyCustomParse}>
              <Play size={13} /> 运行结构化拆解并通知 Agent
            </button>
            <button type="button" className="wb-btn-ghost" onClick={resetToTeamSample}>
              <RotateCcw size={13} /> 恢复 5 人团队样本
            </button>
          </div>
        </div>
      )}

      {/* 清爽双栏驾驶舱：左栏（事项+原文舱） | 右栏（周报 Agent 对话舱） */}
      <div className="wk-main-grid">
        {/* 左栏 */}
        <div className="wk-left-col">
          <div className="wk-task-pane">
            <div className="wb-panel-head">
              <strong>结构化工作项（{visibleItems.length}）</strong>
              <span className="wb-readonly-badge">点击事项可在下方定位企微原句</span>
            </div>

            <div className="wk-task-list">
              {isScanning ? (
                <div className="wb-skeleton-list" aria-busy="true">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="wb-skeleton-card">
                      <div className="wb-skel-line w-65" />
                      <div className="wb-skel-line w-40" />
                    </div>
                  ))}
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="wb-empty">当前筛选条件下暂无工作事项。</div>
              ) : (
                visibleItems.map((item, idx) => {
                  const isSelected = selectedItem?.id === item.id;
                  const resolvedText = resolvedMap[item.id];
                  const isActionable = item.status === '待确认' || item.isDuplicate;
                  const statusClass = resolvedText
                    ? 'ok'
                    : item.status === '已完成'
                      ? 'ok'
                      : item.status === '计划中'
                        ? 'plan'
                        : 'warn';

                  return (
                    <motion.div
                      key={`${runSeed}-${item.id}`}
                      initial={reduced ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24, delay: reduced ? 0 : idx * 0.05 }}
                      className={`wk-task-row${isSelected ? ' selected' : ''}${resolvedText ? ' resolved' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectAndHighlightItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectAndHighlightItem(item);
                        }
                      }}
                    >
                      <div className="wk-task-main">
                        <div className="wk-task-title-line">
                          <span className={`wb-status-badge ${statusClass}`}>
                            {resolvedText || item.status}
                          </span>
                          <strong className="wk-task-name">{item.name}</strong>
                        </div>
                        <div className="wk-task-meta">
                          <span className={item.team ? 'wb-team-tag' : 'wb-team-missing'}>
                            {item.team ? item.author || item.team : '部门/人员未提供（留空）'}
                          </span>
                          <span className="wb-source-id">{item.sourceId}</span>
                          {item.isDuplicate && !resolvedText && (
                            <span className="wb-dup-tag">跨部门重复</span>
                          )}
                          {item.conflictReason && !resolvedText && (
                            <span className="wk-conflict-pill">{item.conflictReason}</span>
                          )}
                        </div>
                      </div>
                      {isActionable && !resolvedText && (
                        <button
                          type="button"
                          className="wb-inline-action-btn wk-row-action"
                          onClick={(e) => handleResolveSingle(e, item)}
                        >
                          {sendingId === item.id ? (
                            <Loader2 size={12} className="wb-spin" />
                          ) : item.isDuplicate && item.status !== '待确认' ? (
                            '合并排期'
                          ) : (
                            '派发核实'
                          )}
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* 底部内嵌只读原文溯源窗（仅聚焦当前选中的一篇，彻底告别多卡片堆叠拥挤） */}
          <div className={`wk-source-dock${isScanning ? ' scanning' : ''}`}>
            {isScanning && <div className="wb-scan-beam" aria-hidden="true" />}
            <div className="wk-source-dock-head">
              <strong>
                📄 企微原文只读存证 · {activeReport?.sourceId}（{activeReport?.author}）
              </strong>
              <div className="wk-source-switcher" role="group" aria-label="切换查看原始周报">
                {parsedResult.reports.map((rep) => (
                  <button
                    key={rep.sourceId}
                    type="button"
                    className={`wk-src-btn${activeReport?.sourceId === rep.sourceId ? ' active' : ''}`}
                    onClick={() => setActiveReportId(rep.sourceId)}
                  >
                    {rep.sourceId}
                  </button>
                ))}
              </div>
            </div>
            <p className="wb-raw-text wk-source-body">
              {activeReport
                ? selectedItem?.sourceId === activeReport.sourceId
                  ? renderHighlightedText(activeReport.rawText, selectedItem.quote)
                  : activeReport.rawText
                : ''}
            </p>
          </div>
        </div>

        {/* 右栏：周报管理问答 Agent 对话舱 */}
        <div className="wk-agent-col">
          <div className="wk-agent-head">
            <div className="wk-agent-title">
              <Sparkles size={15} />
              <strong>周报分析 Agent（Weekly Copilot）</strong>
            </div>
            <span className="wk-agent-guard-tag">只读溯源 · 零脑补</span>
          </div>

          <div className="wk-agent-presets" role="group" aria-label="快捷向周报 Agent 提问">
            {weeklyAgentPrompts.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`wk-agent-preset-btn${p.key === 'hallucination_test' ? ' guard' : ''}`}
                onClick={() => sendWeeklyAgentQuery(p.query)}
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
                    {msg.role === 'agent' && (
                      <div className="med-bubble-head">
                        <span>
                          {msg.route === 'guard_no_fabrication'
                            ? '🛡️ 零脑补防幻觉拦截'
                            : msg.route === 'agent_alert'
                              ? '🤖 周报诊断预警'
                              : '🤖 周报分析 Agent'}
                        </span>
                      </div>
                    )}
                    <p>
                      {contentText}
                      {isStreamingThis && <span className="wb-caret" aria-hidden="true" />}
                    </p>
                    {!isStreamingThis && msg.citations?.length > 0 && (
                      <div className="wk-bubble-cites">
                        {msg.citations.map((c, cIdx) => (
                          <button
                            key={`${c.sourceId}-${cIdx}`}
                            type="button"
                            className="wb-citation-chip"
                            onClick={() => {
                              setStatusFilter('all');
                              setViewScope('all');
                              setSelectedItemId(c.itemId);
                              setActiveReportId(c.sourceId);
                              setFlashKey((k) => k + 1);
                            }}
                          >
                            📄 {c.sourceId} · {c.author}
                          </button>
                        ))}
                      </div>
                    )}
                    {!isStreamingThis && msg.suggestedAction && (
                      <button
                        type="button"
                        className="wk-bubble-action"
                        onClick={() =>
                          handleBatchResolve(msg.suggestedAction.itemIds, msg.suggestedAction.label)
                        }
                      >
                        ⚡ {msg.suggestedAction.label}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {isAgentThinking && (
              <div className="med-msg assistant">
                <div className="med-bubble med-typing-bubble" aria-label="周报 Agent 正在检索分析">
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
              sendWeeklyAgentQuery(chatInput);
            }}
          >
            <input
              type="text"
              className="med-input wk-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="问周报 Agent：研发组有什么风险？数据清洗谁负责？"
              aria-label="向周报分析 Agent 提问"
            />
            <button
              type="submit"
              className="wb-btn-primary med-send-btn wk-send-btn"
              disabled={isAgentThinking}
            >
              <Send size={14} /> 发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 2. 高校招生简章采集与双层选校规则工作台（两阶段筛选 + 选校篮生成交付报告 + 采集震动守门）
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

  // 运行动效与选校方案篮状态
  const [isMatching, setIsMatching] = useState(false);
  const [matchSeed, setMatchSeed] = useState(1);
  const [shortlistIds, setShortlistIds] = useState(['uni-b', 'uni-e']);
  const [reportState, setReportState] = useState('idle'); // 'idle' | 'generating' | 'ready'

  // 采集守门状态
  const [collectorId, setCollectorId] = useState('dirty-missing-basis');
  const [dirtyFixed, setDirtyFixed] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);
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
        stageIndex: 5,
        statusText: '规则筛选与档位配比完成',
        elapsedMs: 380,
      });
      return;
    }

    setIsMatching(true);
    onSyncRuntime({
      running: true,
      stageIndex: 3,
      statusText: '执行 db_filter.py 本地事实库硬规则初筛...',
      elapsedMs: 0,
    });

    const t1 = setTimeout(() => {
      onSyncRuntime({
        running: true,
        stageIndex: 4,
        statusText: '正在校验 GPA 分制、学费口径与开放专业复核...',
        elapsedMs: 210,
      });
    }, 210);

    const t2 = setTimeout(() => {
      setIsMatching(false);
      onSyncRuntime({
        running: false,
        stageIndex: 5,
        statusText: '冲/稳/保 筛选完成 · 可勾选院校生成交付报告',
        elapsedMs: 440,
      });
    }, 440);

    timersRef.current.push(t1, t2);
  }, [clearTimers, onSyncRuntime, reduced]);

  const runCollectorAnimation = useCallback(
    (sampleObj, fixedFlag) => {
      clearTimers();
      setShakeGate(false);
      const baseLogs = [
        `[00:00.12] collector.py -> 巡检来源 ${sampleObj.sourceUrl}`,
        `[00:00.28] pdf_parser -> 抽取学费、学制与年份状态字段`,
        `[00:00.41] db_validate -> 强制校验 tuition_basis 计费口径...`,
      ];
      if (sampleObj.hasDirtyMissingBasis && !fixedFlag) {
        baseLogs.push('[00:00.53] ❌ ERR_MISSING_TUITION_BASIS: 口径为 null，已拦截写入！');
      } else if (fixedFlag) {
        baseLogs.push('[00:00.54] ✓ 已补齐 total_program · 备份 university_db.bak.json 并入库 (37/37 PASS)');
      } else {
        baseLogs.push('[00:00.52] ✓ 校验通过 · 写入本地事实库并完成 37 项回归');
      }

      if (reduced) {
        setIsIngesting(false);
        setTerminalLines(baseLogs);
        onSyncRuntime({
          running: false,
          stageIndex: sampleObj.hasDirtyMissingBasis && !fixedFlag ? 1 : 2,
          statusText:
            sampleObj.hasDirtyMissingBasis && !fixedFlag
              ? '脏数据已被守门拦截'
              : '采集解析与入库校验 PASS',
          elapsedMs: 530,
        });
        return;
      }

      setIsIngesting(true);
      setTerminalLines([]);
      onSyncRuntime({
        running: true,
        stageIndex: 0,
        statusText: '后台采集 Skill 正在巡检官网与 PDF 简章...',
        elapsedMs: 0,
      });

      baseLogs.forEach((line, idx) => {
        const delay = (idx + 1) * 145;
        const t = setTimeout(() => {
          setTerminalLines((prev) => [...prev, line]);
          const isLast = idx === baseLogs.length - 1;
          if (!isLast) {
            onSyncRuntime({
              running: true,
              stageIndex: Math.min(2, idx + 1),
              statusText: idx === 1 ? '正在校验 tuition_basis 口径...' : '正在解析简章文本...',
              elapsedMs: delay,
            });
          } else {
            setIsIngesting(false);
            const blocked = sampleObj.hasDirtyMissingBasis && !fixedFlag;
            if (blocked) setShakeGate(true);
            onSyncRuntime({
              running: false,
              stageIndex: blocked ? 1 : 2,
              statusText: blocked
                ? '⚠️ 拦截缺失口径脏数据 · 等待核实补全'
                : '✓ 自动备份入库成功 · 37/37 回归 PASS',
              elapsedMs: delay,
            });
          }
        }, delay);
        timersRef.current.push(t);
      });
    },
    [clearTimers, onSyncRuntime, reduced]
  );

  // 响应模式/参数/重播触发
  useEffect(() => {
    if (subMode === 'matcher') {
      runMatcherAnimation();
    } else {
      runCollectorAnimation(ingestResult.sample, dirtyFixed);
    }
  }, [subMode, gpaTier, maxAnnualBudget, language, requireFullScholarship, crossMajor, collectorId, dirtyFixed, replayNonce]);

  // 响应外部一键试玩预设
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

  // 同步 Live Payload
  useEffect(() => {
    if (subMode === 'matcher') {
      onSyncRuntime({
        payload: {
          command: 'python db_filter.py filter --target-year 2026',
          original_gpa_scale: matchResult.gpaObj.originalScale,
          student_tier: matchResult.gpaObj.tier,
          max_annual_budget: maxAnnualBudget,
          require_full_scholarship: requireFullScholarship,
          cross_major_case_by_case: crossMajor,
          matched_count: matchResult.matched.length,
          eliminated_count: matchResult.eliminated.length,
          shortlisted_ids: shortlistIds.filter((id) =>
            matchResult.matched.some((m) => m.id === id)
          ),
          tier_guard: matchResult.tierGuardReport.status,
        },
      });
    } else {
      onSyncRuntime({
        payload: {
          skill: 'university-program-collector',
          sample_id: collectorId,
          db_validate_passed: ingestResult.passed,
          regression_tests: ingestResult.regressionStatus,
          extracted: ingestResult.payload,
        },
      });
    }
  }, [subMode, matchResult, maxAnnualBudget, requireFullScholarship, crossMajor, shortlistIds, collectorId, ingestResult]);

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
    onToast(`已智能配齐 ${ids.length} 所冲/稳/保梯队院校入方案篮`);
  };

  const generateReport = () => {
    if (activeShortlist.length === 0) return;
    setReportState('generating');
    const delay = reduced ? 0 : 480;
    const t = setTimeout(() => {
      setReportState('ready');
      onToast(`已生成 ${activeShortlist.length} 所院校的客户交付版 HTML 选校报告`);
    }, delay);
    timersRef.current.push(t);
  };

  const copyReportSummary = async () => {
    const lines = [
      `【来华留学定校交付报告】(${matchResult.gpaObj.label} · 预算≤¥${maxAnnualBudget === 999999 ? '不限' : maxAnnualBudget}/年)`,
      ...activeShortlist.map(
        (u, i) =>
          `${i + 1}. [${u.tierLabel}] ${u.schoolName} - ${u.program} | 折算 ¥${u.annualTuition}/年 (${u.tuitionBasis}) | 来源: ${u.sourceFile}`
      ),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      onToast('已复制定校交付摘要到剪贴板');
    } catch {
      onToast('交付摘要已准备就绪（当前浏览器禁止自动写入剪贴板）');
    }
  };

  const yearBadge = (status) => {
    if (status === 'fresh') return { text: '2026 当年新简章', cls: 'fresh' };
    if (status === 'historical') return { text: '2025 批次预匹配', cls: 'hist' };
    return { text: '⚠️ 批次待重核', cls: 'recheck' };
  };

  return (
    <div className="wb-shell" data-workbench="university">
      <div className="wb-toolbar">
        <div className="wb-pills" role="group" aria-label="切换高校沙盒模式">
          <button
            type="button"
            className="wb-pill"
            aria-pressed={subMode === 'matcher'}
            onClick={() => setSubMode('matcher')}
          >
            🎯 双层选校规则引擎
          </button>
          <button
            type="button"
            className="wb-pill"
            aria-pressed={subMode === 'collector'}
            onClick={() => setSubMode('collector')}
          >
            📄 后台 PDF 采集与脏数据守门
          </button>
        </div>
        <span className="wb-badge-mono">8 所脱敏样本 · 37/37 回归守门</span>
      </div>

      {subMode === 'matcher' ? (
        <>
          <div className="uni-controls">
            <div className="uni-control-group">
              <span className="uni-control-label">原始成绩分制（禁止跨制换算）</span>
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

            <div className="uni-control-row">
              <div className="uni-control-group">
                <span className="uni-control-label">年预算上限（按口径折算）</span>
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

              <div className="uni-control-group">
                <span className="uni-control-label">授课语言</span>
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
                <span className="uni-control-label">硬条件 & 语义边界开关</span>
                <div className="wb-mini-filters">
                  <button
                    type="button"
                    className={`wb-chip-btn${requireFullScholarship ? ' active' : ''}`}
                    aria-pressed={requireFullScholarship}
                    onClick={() => setRequireFullScholarship((v) => !v)}
                  >
                    {requireFullScholarship ? '✓ 仅限全额奖学金' : '不限奖学金'}
                  </button>
                  <button
                    type="button"
                    className={`wb-chip-btn${crossMajor ? ' active' : ''}`}
                    aria-pressed={crossMajor}
                    onClick={() => setCrossMajor((v) => !v)}
                  >
                    {crossMajor ? '✓ 机械跨申计算机' : '计算机本专业'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`uni-guard-banner ${matchResult.tierGuardReport.status}`}>
            {isMatching ? <Loader2 size={15} className="wb-spin" /> : <ShieldCheck size={15} />}
            <div>
              <strong>{matchResult.gpaObj.note}</strong>
              <span>
                {isMatching
                  ? '正在比对本地事实库硬门槛与梯队配比...'
                  : matchResult.tierGuardReport.text}
              </span>
            </div>
          </div>

          <div className="wb-split-grid">
            {/* 左栏：冲稳保匹配报告 + 加入选校单按钮 */}
            <div className="wb-panel">
              <div className="wb-panel-head">
                <strong>冲 / 稳 / 保 匹配报告（{matchResult.matched.length} 所）</strong>
                {matchResult.matched.length > 0 && (
                  <button type="button" className="wb-chip-btn" onClick={autoFillShortlist}>
                    ✨ 智能一键配齐
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
                  <div className="wb-empty">
                    所有候选院校均被硬规则拦截，可放宽预算或取消“仅限全额奖学金”重算。
                  </div>
                ) : (
                  matchResult.matched.map((uni, idx) => {
                    const yBadge = yearBadge(uni.yearStatus);
                    const isExpanded = expandedUniId === uni.id;
                    const inList = shortlistIds.includes(uni.id);
                    return (
                      <motion.div
                        key={`${matchSeed}-${uni.id}`}
                        initial={reduced ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: reduced ? 0 : idx * 0.06 }}
                        className={`uni-card${inList ? ' shortlisted' : ''}`}
                      >
                        <div className="uni-card-btn-wrap">
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
                                年化 ¥{uni.annualTuition.toLocaleString()}/年（
                                {uni.tuitionBasis === 'total_program'
                                  ? `total_program 总¥${uni.tuitionAmount.toLocaleString()}`
                                  : 'academic_year'}
                                ）
                              </span>
                              <span className={`uni-year-tag ${yBadge.cls}`}>{yBadge.text}</span>
                            </div>
                            {uni.conditionalReview && (
                              <p className="uni-conditional-tip">
                                <AlertTriangle size={12} /> {uni.conditionalReview}
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
                                <Check size={12} /> 已入选校单
                              </>
                            ) : (
                              <>
                                <Plus size={12} /> 加入选校单
                              </>
                            )}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="uni-quote-box">
                            <small>来源文件：{uni.sourceFile}</small>
                            <p>{uni.brochureQuote}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 右栏：硬规则一票否决拦截 */}
            <div className="wb-panel">
              <div className="wb-panel-head">
                <strong>硬规则一票否决拦截（{matchResult.eliminated.length} 所）</strong>
                <span className="wb-readonly-badge">不送大模型 · 代码直裁</span>
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
                  <div className="wb-empty">当前条件下没有被硬规则淘汰的样本院校。</div>
                ) : (
                  matchResult.eliminated.map((uni, idx) => (
                    <motion.div
                      key={`${matchSeed}-elim-${uni.id}`}
                      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.24, delay: reduced ? 0 : idx * 0.05 }}
                      className="uni-elim-card"
                    >
                      <div className="uni-elim-head">
                        <span>{uni.schoolName}</span>
                        <span className="uni-elim-stamp">硬规则淘汰</span>
                      </div>
                      <small className="uni-elim-prog">{uni.program}</small>
                      <ul className="uni-elim-reasons">
                        {uni.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 上手闭环：选校方案篮 & 一键渲染客户交付版 HTML 选校报告 */}
          <div className="uni-basket-bar">
            <div className="uni-basket-meta">
              <FileCheck2 size={16} />
              <span>
                当前定校方案篮：已选 <b>{activeShortlist.length}</b> 所（冲{' '}
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
                  <Loader2 size={14} className="wb-spin" /> 正在校验并渲染报告...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> 生成客户交付版选校报告
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {reportState === 'ready' && activeShortlist.length > 0 && (
              <motion.div
                className="uni-report-preview"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="uni-report-head">
                  <div>
                    <span className="uni-report-kicker">generate_report.py · 37/37 守门自检 PASS</span>
                    <h5>《来华留学冲/稳/保定校交付报告预览》</h5>
                  </div>
                  <button type="button" className="wb-btn-ghost" onClick={copyReportSummary}>
                    <Copy size={13} /> 复制交付摘要
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
                          折算学费：¥{u.annualTuition.toLocaleString()}/年（{u.tuitionBasis}） · 来源：
                          {u.sourceFile}
                        </small>
                      </div>
                      {u.yearStatus === 'recheck' && (
                        <span className="uni-year-tag recheck">红字预警：待重核</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* 模式 B：后台 PDF 采集与脏数据守门 */
        <div className="uni-collector-wrap">
          <div className="wb-mini-filters" role="group" aria-label="选择采集入库测试样本">
            {collectorSamples.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`wb-chip-btn${collectorId === s.id ? ' active' : ''}`}
                onClick={() => {
                  setCollectorId(s.id);
                  setDirtyFixed(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="wb-split-grid">
            <div className="wb-panel">
              <div className="wb-panel-head">
                <strong>
                  <Terminal size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> 1. 后台采集日志流
                </strong>
                <span className="wb-readonly-badge">{ingestResult.sample.sourceUrl}</span>
              </div>
              <div className="uni-terminal-box" aria-live="polite">
                {terminalLines.map((line, i) => (
                  <div
                    key={i}
                    className={`uni-term-line${line.includes('❌') ? ' err' : line.includes('✓') ? ' ok' : ''}`}
                  >
                    {line}
                  </div>
                ))}
                {isIngesting && <div className="uni-term-cursor">▌</div>}
              </div>
              <div className="uni-extract-json">
                <span>2. 标准化抽取结果（写入前强制校验 tuition_basis）：</span>
                <pre>{JSON.stringify(ingestResult.payload, null, 2)}</pre>
              </div>
            </div>

            <div className={`wb-panel${shakeGate ? ' wb-shake-danger' : ''}`}>
              <div className="wb-panel-head">
                <strong>3. db_validate 守门与自动备份</strong>
                <span className={`uni-gate-pill ${ingestResult.passed ? 'pass' : 'fail'}`}>
                  {isIngesting ? 'CHECKING...' : ingestResult.passed ? 'PASS' : 'BLOCKED'}
                </span>
              </div>
              {isIngesting ? (
                <div className="wb-empty">
                  <Loader2 size={16} className="wb-spin" /> 正在校验简章口径与事实库兼容性...
                </div>
              ) : ingestResult.passed ? (
                <motion.div
                  className="uni-gate-ok"
                  initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>校验通过，已安全写入本地事实库 university_db.json</strong>
                    <p>回归状态：{ingestResult.regressionStatus}</p>
                    <p>备份机制：{ingestResult.backupFile}</p>
                  </div>
                </motion.div>
              ) : (
                <div className="uni-gate-fail">
                  <ShieldAlert size={18} />
                  <div>
                    <strong>脏数据写入已拦截！</strong>
                    {ingestResult.errors.map((err) => (
                      <p key={err}>{err}</p>
                    ))}
                    <button
                      type="button"
                      className="wb-btn-primary"
                      onClick={() => {
                        setDirtyFixed(true);
                        onToast('已向官网核实补齐 total_program 口径并重跑入库');
                      }}
                    >
                      <Check size={13} /> 核实官网补全 tuition_basis = total_program 并重验
                    </button>
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
 * 3. 跨境医疗双语 RAG 客服与安全护栏工作台（Typing 等待 + 流式回复 + 护栏震动 + 顾问接单闭环）
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
      text: '您好！我是跨境就医双语服务助手（本地沙盒模式）。您可以点击上方快捷测试，或直接输入含地区和邮箱的话语测试自动留资；若问肺部结节诊断或手术精确报价，将立刻触发红色安全护栏强制转人工。',
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
    intentLabel: '等待提问 · 服务知识库待命',
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
        const botMsg = {
          id: botId,
          role: 'assistant',
          text: result.reply,
          route: result.route,
          faqId: result.matchedFaq?.id || null,
        };
        setMessages((prev) => [...prev, botMsg]);
        setLead(result.lead);
        setUpdatedFields(result.updatedFields);
        setTelemetry({
          route: result.route,
          intentLabel: result.intentLabel,
          guardrailTriggered: result.guardrailTriggered,
          guardrailReason: result.guardrailReason,
          matchedFaq: result.matchedFaq || telemetry.matchedFaq,
        });
        onSyncRuntime({
          running: false,
          stageIndex: result.guardrailTriggered || result.updatedFields.length > 0 ? 4 : 3,
          statusText: result.guardrailTriggered
            ? '🛡️ 安全护栏已拦截 · 转人工顾问'
            : '✓ 双语检索与线索提取完成',
          elapsedMs: 320,
          payload: {
            language: targetLang,
            intent: result.intentLabel,
            route: result.route,
            guardrail_triggered: result.guardrailTriggered,
            extracted_lead: result.lead,
          },
        });
        return;
      }

      setIsTyping(true);
      onSyncRuntime({
        running: true,
        stageIndex: 1,
        statusText: '正在执行意图识别与安全护栏判定...',
        elapsedMs: 0,
      });

      const tThink = setTimeout(() => {
        onSyncRuntime({
          running: true,
          stageIndex: result.guardrailTriggered ? 3 : 2,
          statusText: result.guardrailTriggered
            ? '⚠️ 检测到高风险诊疗/报价词，拦截自由生成！'
            : '正在检索约 170 条双语 FAQ 知识库...',
          elapsedMs: 220,
        });
      }, 180);

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

        const botMsg = {
          id: botId,
          role: 'assistant',
          text: result.reply,
          route: result.route,
          faqId: result.matchedFaq?.id || null,
        };
        setMessages((prev) => [...prev, botMsg]);

        // 流式输出回复文本
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
              stageIndex: 4,
              statusText: result.guardrailTriggered
                ? '🛡️ 护栏已强制拦截 · 请点右下角模拟人工顾问接管'
                : result.updatedFields.length > 0
                  ? '✓ 已提取结构化线索并更新顾问卡'
                  : '✓ 已依据 FAQ 返回受约束双语回答',
              elapsedMs: 620,
              payload: {
                language: targetLang,
                intent: result.intentLabel,
                route: result.route,
                guardrail_triggered: result.guardrailTriggered,
                citation_id: result.matchedFaq?.id || null,
                extracted_lead: result.lead,
                human_joined: humanJoined,
              },
            });
          } else {
            setStreamingText(result.reply.slice(0, idx));
          }
        }, 14);
        timersRef.current.push(streamTimer);
      }, 380);

      timersRef.current.push(tThink, tReply);
    },
    [clearTimers, humanJoined, isTyping, lang, lead, onSyncRuntime, reduced, telemetry.matchedFaq]
  );

  // 初始化状态栏与重播示例
  useEffect(() => {
    onSyncRuntime({
      running: false,
      stageIndex: 2,
      statusText: '双语 RAG 沙盒与安全护栏待命中',
      elapsedMs: 120,
      payload: {
        language: lang,
        route: telemetry.route,
        guardrail_triggered: telemetry.guardrailTriggered,
        extracted_lead: lead,
      },
    });
  }, [replayNonce]);

  // 响应外部一键试玩预设
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
    const agentMsg = {
      id: `human-${Date.now()}`,
      role: 'assistant',
      route: 'human_agent_joined',
      text:
        lang === 'en'
          ? `Hi, this is Sarah (Senior Bilingual Medical Coordinator, Ticket #MC-208). I have received your AI handoff summary for ${regionPart} (${needPart})${contactPart}. I will review your medical reports and send an official hospital schedule within 2 hours.`
          : `您好，我是人工双语医疗顾问 Sarah（工单 #MC-208）。我已完整收到系统交接的上下文：来自「${regionPart}」，咨询「${needPart}」${contactPart}。高风险医疗与费用核算问题由我本人对接医院核实后给您正式书面回复。`,
    };
    setMessages((prev) => [...prev, agentMsg]);
    onToast('🟢 人工医疗顾问 Sarah 已接管工单 #MC-208');
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
            ? 'Sandbox reset. Ask about booking, visa, translation, or test our medical diagnosis / pricing guardrails.'
            : '沙盒已重置。您可以测试常规预约/翻译咨询、输入地区与邮箱测试自动留资，或问病情/精确报价触发人工接管护栏。',
        route: 'rag_cited',
        faqId: 'K-008',
      },
    ]);
    setLead({ region: '', need: '', contact: '', handoffStatus: 'collecting' });
    setUpdatedFields([]);
    setTelemetry({
      route: 'rag_cited',
      intentLabel: '等待提问 · 服务知识库待命',
      guardrailTriggered: false,
      guardrailReason: null,
      matchedFaq: medicalFaqEntries[0],
    });
  };

  const leadScore = [lead.region, lead.need, lead.contact].filter(Boolean).length;

  const handoffTextMap = {
    collecting: 'AI 自助应答中（持续识别线索）',
    lead_ready: '✅ 线索已收齐 · 可推送顾问跟进',
    human_normal: '🟡 超出 FAQ 范围 · 转人工顾问核实',
    human_priority: '🔴 触发医疗/报价红线 · 人工优先接管',
  };

  return (
    <div className="wb-shell" data-workbench="medical">
      <div className="wb-toolbar">
        <div className="wb-pills" role="group" aria-label="切换对话语言">
          <button
            type="button"
            className="wb-pill"
            aria-pressed={lang === 'zh'}
            onClick={() => setLang('zh')}
          >
            中文模式
          </button>
          <button
            type="button"
            className="wb-pill"
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            English Mode
          </button>
        </div>
        <div className="med-toolbar-right">
          <span className="wb-badge-mono">本地规则沙盒 · 不上传真实资料</span>
          <button type="button" className="wb-btn-ghost" onClick={resetChat}>
            <RotateCcw size={13} /> 重置
          </button>
        </div>
      </div>

      {/* 快捷提问测试胶囊 */}
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
        {/* 左栏：真实聊天窗口 */}
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
                            ? '👩‍⚕️ 人工双语顾问 · Sarah（已接管）'
                            : msg.route === 'human_handoff_guardrail'
                              ? '🛡️ 安全护栏已拦截'
                              : msg.route === 'out_of_kb_handoff'
                                ? '👤 转人工核实'
                                : '📚 双语知识库应答'}
                        </span>
                        {msg.faqId && (
                          <button
                            type="button"
                            className="med-faq-ref"
                            onClick={() => {
                              const found = medicalFaqEntries.find((f) => f.id === msg.faqId);
                              if (found) {
                                setTelemetry((prev) => ({ ...prev, matchedFaq: found }));
                              }
                            }}
                          >
                            [FAQ #{msg.faqId}]
                          </button>
                        )}
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
                <div className="med-bubble med-typing-bubble" aria-label="助手正在处理">
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
                  ? 'Type a question, email, or test medical guardrail...'
                  : '输入问题（如：我在美国，邮箱 a@b.com，想咨询肺结节吃什么药）'
              }
              aria-label="输入模拟医疗咨询内容"
            />
            <button type="submit" className="wb-btn-primary med-send-btn" disabled={isTyping}>
              <Send size={14} /> 发送
            </button>
          </form>
        </div>

        {/* 右栏：安全护栏状态 + 知识引用 + 实时线索提取卡 + 顾问接单闭环 */}
        <div className="med-telemetry-col">
          <div
            className={`med-guard-card ${telemetry.guardrailTriggered ? 'danger' : 'safe'}${shakeGuard ? ' wb-shake-danger' : ''}`}
          >
            <div className="med-guard-head">
              {telemetry.guardrailTriggered ? (
                <ShieldAlert size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              <strong>
                {telemetry.guardrailTriggered ? '高风险红线拦截（转人工）' : '服务安全边界正常'}
              </strong>
            </div>
            <p className="med-intent-line">当前意图：{telemetry.intentLabel}</p>
            {telemetry.guardrailReason && (
              <p className="med-guard-reason">{telemetry.guardrailReason}</p>
            )}
          </div>

          {telemetry.matchedFaq && (
            <div className="med-kb-card">
              <div className="med-kb-head">
                <Database size={14} />
                <strong>引用知识片段 · {telemetry.matchedFaq.id}</strong>
                <span>{telemetry.matchedFaq.category}</span>
              </div>
              <p>{lang === 'en' ? telemetry.matchedFaq.answerEn : telemetry.matchedFaq.answerZh}</p>
            </div>
          )}

          <div className="med-lead-card" aria-label="自动提取的结构化客户线索卡">
            <div className="med-lead-head">
              <UserCheck size={15} />
              <strong>顾问跟进线索卡（完整度 {leadScore}/3）</strong>
            </div>
            <div className="wb-progress-track med-lead-progress" aria-hidden="true">
              <div
                className="wb-progress-fill"
                style={{ width: `${Math.round((leadScore / 3) * 100)}%` }}
              />
            </div>
            <dl className="med-lead-fields">
              <div className={updatedFields.includes('region') ? 'updated' : ''}>
                <dt>国家/地区</dt>
                <dd>{lead.region || '待识别（在对话中提及国家/城市）'}</dd>
              </div>
              <div className={updatedFields.includes('need') ? 'updated' : ''}>
                <dt>就医需求</dt>
                <dd>{lead.need || '待识别'}</dd>
              </div>
              <div className={updatedFields.includes('contact') ? 'updated' : ''}>
                <dt>联系方式</dt>
                <dd>{lead.contact || '待识别（邮箱 / 微信 / 电话）'}</dd>
              </div>
              <div>
                <dt>流转状态</dt>
                <dd
                  className={`med-handoff-status ${humanJoined ? 'lead_ready' : lead.handoffStatus}`}
                >
                  {humanJoined
                    ? '🟢 双语顾问 Sarah 已接管工单 #MC-208'
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
                  <CheckCircle2 size={14} /> 人工顾问已接管会话
                </>
              ) : (
                <>
                  <UserCheck size={14} /> 模拟人工顾问接手会话
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 真实线上 Dify + 自研 widget.js 客服挂件无缝入口 */}
      <div className="med-live-toggle-wrap">
        <button
          type="button"
          className="med-live-toggle-btn"
          aria-expanded={liveWidgetOpen}
          onClick={() => setLiveWidgetOpen((v) => !v)}
        >
          <span>
            <MessageSquare size={14} /> 想看线上真实部署效果？点此
            {liveWidgetOpen ? '收起' : '开启'}真实 Dify + 自研 widget.js 客服挂件
          </span>
          {liveWidgetOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {liveWidgetOpen && <ChatbotDemo />}
      </div>
    </div>
  );
}

/* ============================================================================
 * 对外主组件：CaseExperience（拟真软件壳 + 动态流水线进度轨 + 悬浮回执 + 三大工作台）
 * ============================================================================ */
export function CaseExperience({ project, activePreset = null }) {
  const demo = caseDemos[project.id];
  const reduced = useReducedMotion();
  const [view, setView] = useState('workflow');
  const [replayNonce, setReplayNonce] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [runtime, setRuntime] = useState({
    running: false,
    stageIndex: 0,
    statusText: '就绪',
    elapsedMs: 0,
    payload: { project: project.id, status: 'ready' },
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
    setRuntime((prev) => ({
      ...prev,
      ...patch,
      payload: patch.payload ?? prev.payload,
    }));
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
          <Play size={13} /> 交互工作台
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
        {/* 拟真软件窗口外壳 */}
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
              {runtime.elapsedMs > 0 && !runtime.running && (
                <span className="wb-elapsed-tag">耗时 {(runtime.elapsedMs / 1000).toFixed(2)}s</span>
              )}
              <button
                type="button"
                className="wb-replay-btn"
                onClick={() => setReplayNonce((n) => n + 1)}
              >
                <RotateCcw size={12} className={runtime.running ? 'wb-spin' : ''} /> 重新运行演示
              </button>
            </div>
          </div>

          {/* 悬浮操作回执 Toast */}
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

          {/* 动态流水线状态轨 */}
          <div className="wb-pipeline-rail" aria-label="系统处理流水线状态">
            {project.workflow.map((stepName, index) => {
              const state =
                index < runtime.stageIndex
                  ? 'done'
                  : index === runtime.stageIndex
                    ? 'active'
                    : 'idle';
              return (
                <div key={stepName} className={`wb-pipe-step ${state}`}>
                  <span className="wb-pipe-num">
                    {state === 'done' ? <Check size={11} /> : String(index + 1).padStart(2, '0')}
                  </span>
                  <strong>{stepName}</strong>
                </div>
              );
            })}
          </div>

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

        {/* 实时动态 JSON 结构检查器 */}
        <details className="demo-payload">
          <summary>
            <Sparkles size={13} /> 查看当前沙盒实时输出的数据结构（Live JSON）
          </summary>
          <pre>{JSON.stringify(runtime.payload, null, 2)}</pre>
        </details>
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
        <div>
          <span>交互工作台沙盒</span>
          <h2 id="case-dialog-title">{project.title}</h2>
        </div>
        <button type="button" autoFocus aria-label="关闭案例预览" onClick={closeDialog}>
          <X size={20} />
        </button>
      </div>
      <CaseExperience project={project} activePreset={activePreset} />
      <div className="dialog-bottom">
        <p>所有演示均运行于本地脱敏样本，真实工程代码已沉淀架构分层、异常拦截与自动化回归。</p>
        <a className="button-primary" href={`portfolio.html#${project.id}`}>
          阅读完整案例 <ArrowRight size={16} />
        </a>
      </div>
    </dialog>
  );
}
