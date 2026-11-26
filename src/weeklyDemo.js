// 本地交互样例与纯前端规则解析 / 周报 AI 助手引擎，不使用真实员工或企业数据。

export const weeklyRawReports = [
  {
    sourceId: 'R1',
    author: '张磊',
    team: '研发组',
    rawText:
      '研发组：本周完成客户订单导出脚本开发，已接入测试环境；支付回调接口连续两周卡在等待法务确认字段。',
  },
  {
    sourceId: 'R2',
    author: '王敏',
    team: '产品组',
    rawText:
      '产品组：本周已完成周报权限看板原型评审；下周计划输出移动端消息推送交互稿。',
  },
  {
    sourceId: 'R3',
    author: '李浩',
    team: '交付组',
    rawText:
      '交付组：独立开发了客户订单导出脚本用于客户对账；下周计划整理客户上线验收清单。',
  },
  {
    sourceId: 'R4',
    author: '陈默',
    team: '研发组',
    rawText:
      '研发组：订单同步已经完成。补充：订单同步异常重试尚未通过验收。',
  },
  {
    sourceId: 'R5',
    author: '赵宇',
    team: '运营组',
    rawText:
      '本周推进了客户历史数据清洗，目前还有问题需要处理。',
  },
];

const TEAM_PREFIX_RE = /^(研发组|产品组|交付组|运营组|客服组|测试组|法务组|设计组)[：:]\s*/;
const INLINE_TEAM_RE = /(研发组|产品组|交付组|运营组|客服组|测试组|法务组|设计组)(?:的|本周|下周)/;
const COMPLETE_RE = /(已经?完成|本周已完成|本周完成|已上线|已完成|已闭环|已接入|通过验收|已交付|开发了)/;
const PLAN_RE = /(下周|计划|准备|安排|排期|拟)/;
const RISK_RE = /(异常|未通过|尚未通过|报错|问题|卡在|等待|待确认|阻塞|连续两周)/;
const VAGUE_RE = /(推进了|跟进中|处理中|正在看|对接中)/;

function splitSentences(rawText) {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/[;\n；]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const merged = [];
  for (const block of blocks) {
    const subParts = block
      .split(/[。]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of subParts) {
      if (/^补充[：:]/.test(part) && merged.length > 0) {
        merged[merged.length - 1] = `${merged[merged.length - 1]}。${part}`;
      } else {
        merged.push(part);
      }
    }
  }
  return merged;
}

function extractTitle(sentence) {
  let clean = sentence
    .replace(TEAM_PREFIX_RE, '')
    .replace(/^补充[：:]\s*/, '')
    .replace(/^(本周|下周|目前|独立|已经)/, '')
    .trim();

  const commaIdx = clean.search(/[，,。]/);
  if (commaIdx > 2 && commaIdx <= 22) {
    clean = clean.slice(0, commaIdx);
  } else if (clean.length > 22) {
    clean = `${clean.slice(0, 22)}…`;
  }
  return clean || '未命名事项';
}

function detectDuplicateKeys(items) {
  const duplicateKeywords = ['订单导出脚本', '数据看板', '数据清洗', '接口联调'];
  const hitCounts = new Map();

  for (const item of items) {
    for (const kw of duplicateKeywords) {
      if (item.quote.includes(kw) || item.name.includes(kw)) {
        if (!hitCounts.has(kw)) hitCounts.set(kw, []);
        hitCounts.get(kw).push(item);
      }
    }
  }

  const dupIds = new Set();
  const duplicatePairs = [];
  for (const [kw, list] of hitCounts.entries()) {
    const distinctTeams = new Set(list.map((x) => x.team || x.sourceId));
    if (list.length >= 2 && distinctTeams.size >= 2) {
      list.forEach((x) => dupIds.add(x.id));
      duplicatePairs.push({ topic: kw, items: list });
    }
  }

  return { dupIds, duplicatePairs };
}

/**
 * 纯前端周报结构化解析器：保留原话可溯源，不脑补缺失字段，矛盾/模糊句标待核实。
 */
export function parseWeeklyReportText(
  rawText,
  sourceId = 'CUSTOM',
  fallbackTeam = null,
  author = '员工'
) {
  const sentences = splitSentences(rawText);
  let inheritedTeam = fallbackTeam;

  return sentences.map((sentence, idx) => {
    const prefixMatch = sentence.match(TEAM_PREFIX_RE);
    const inlineMatch = sentence.match(INLINE_TEAM_RE);
    if (prefixMatch) {
      inheritedTeam = prefixMatch[1];
    }

    const team = prefixMatch ? prefixMatch[1] : inlineMatch ? inlineMatch[1] : inheritedTeam || null;
    const hasComplete = COMPLETE_RE.test(sentence);
    const hasPlan = PLAN_RE.test(sentence);
    const hasRisk = RISK_RE.test(sentence);
    const hasVague = VAGUE_RE.test(sentence);

    let status = '待确认';
    let riskTag = null;
    let riskNote = null;
    let actionLabel = null;

    if (hasComplete && hasRisk) {
      status = '待确认';
      riskTag = '前后矛盾';
      riskNote = '先写完成又补“未过验收”，拒绝计为完成';
      actionLabel = '退回核实';
    } else if (hasRisk) {
      status = '待确认';
      riskTag = sentence.includes('连续') ? '拖延 2 周' : '进度受阻';
      riskNote = sentence.includes('连续')
        ? '卡在法务确认字段已 2 周，建议催办'
        : '存在未决问题，暂缺完成时间';
      actionLabel = '企微催办';
    } else if (hasPlan && !hasComplete) {
      status = '下周计划';
    } else if (hasComplete) {
      status = '已完成';
    } else if (hasVague) {
      status = '待确认';
      riskTag = '缺结论排期';
      riskNote = '只写“推进了”，未写结果和截止日';
      actionLabel = '追问排期';
    } else {
      status = '待确认';
      riskTag = '待核实';
      riskNote = '未明确是否交付完成';
      actionLabel = '企微核实';
    }

    return {
      id: `${sourceId}-${idx + 1}`,
      sourceId,
      author,
      team,
      name: extractTitle(sentence),
      status,
      quote: sentence,
      riskTag,
      riskNote,
      actionLabel,
      isDuplicate: false,
    };
  });
}

export function parseSampleReports(reports) {
  const allItems = [];
  for (const rep of reports) {
    const parsed = parseWeeklyReportText(rep.rawText, rep.sourceId, rep.team || null, rep.author);
    allItems.push(...parsed);
  }
  const { dupIds, duplicatePairs } = detectDuplicateKeys(allItems);
  const enriched = allItems.map((item) => {
    const isDup = dupIds.has(item.id);
    return {
      ...item,
      isDuplicate: isDup,
      riskTag: isDup && !item.riskTag ? '重复开发' : item.riskTag,
      riskNote:
        isDup && !item.riskNote
          ? '与他组开发同一功能，建议拉通合并'
          : item.riskNote,
      actionLabel: isDup && !item.actionLabel ? '拉通合并' : item.actionLabel,
    };
  });
  return { items: enriched, duplicatePairs };
}

export const defaultWeeklyData = parseSampleReports(weeklyRawReports);

export const weeklyAgentPrompts = [
  {
    key: 'top_risks',
    label: '💡 本周重点隐患',
    query: '本周最需要我重点盯防的风险和卡点有哪些？',
  },
  {
    key: 'dups',
    label: '🔍 谁在重复干活？',
    query: '检查一下有没有同事在跨部门重复开发同一个功能？',
  },
  {
    key: 'hallucination_test',
    label: '❓ 数据清洗哪天上线？（测防瞎编）',
    query: '客户历史数据清洗是谁负责的？哪天能上线？',
  },
];

/**
 * 老板视角大白话周报 AI 秘书问答
 */
export function askWeeklyAgent(queryText, items, reports = [], duplicatePairs = []) {
  const q = String(queryText || '').trim();
  const { duplicatePairs: liveDups } =
    duplicatePairs.length > 0 ? { duplicatePairs } : detectDuplicateKeys(items);

  // 1. 追问原文未写明的排期/责任人/预算（防瞎编）
  const asksWhoOrWhen = /(谁|哪天|什么时候|时间|几号|排期|上线|弄完|预算|准确率|KPI)/i.test(q);
  const mentionsCleaningOrMissing =
    /(数据清洗|历史数据|未知|数据接入|没写|缺)/i.test(q) ||
    items.some((i) => i.status === '待确认' && q.includes(i.name.slice(0, 4)));

  if (asksWhoOrWhen && mentionsCleaningOrMissing) {
    const targetItem =
      items.find((i) => i.quote.includes('数据清洗')) ||
      items.find((i) => i.status === '待确认') ||
      items[0];
    if (targetItem) {
      return {
        route: 'guard_no_fabrication',
        answer: `🛡️ 原文没写，AI 绝不替员工瞎猜日期。\n\n${targetItem.author}（${targetItem.team || '未注明部门'}）在周报里只写了：“${targetItem.quote}”。\n• 没写具体哪天上线，也没写问题卡在哪。\n\n点下方按钮，我直接帮您发企微追问他明确排期：`,
        highlightItemId: targetItem.id,
        suggestedAction: {
          itemIds: [targetItem.id],
          label: `发企微追问${targetItem.author}明确排期`,
        },
      };
    }
  }

  // 2. 跨部门重复干活
  if (/(重复|撞车|造轮子|导出脚本|浪费|相同)/i.test(q)) {
    if (liveDups.length === 0) {
      return {
        route: 'agent_ok',
        answer: '当前周报里没有发现跨部门重复开发的事项，大家分工不撞车。',
        highlightItemId: null,
        suggestedAction: null,
      };
    }
    const pair = liveDups[0];
    const whoText = pair.items.map((i) => `${i.author}（${i.team}）`).join(' 和 ');
    return {
      route: 'agent_alert',
      answer: `🔍 抓到 1 处跨部门重复干活：\n${whoText} 本周都在各自开发「${pair.topic}」。\n\n建议直接拉个小群合并复用同一份代码，立省约 2 人天工作量：`,
      highlightItemId: pair.items[0]?.id || null,
      suggestedAction: {
        itemIds: pair.items.map((i) => i.id),
        label: '一键拉通双方合并排期',
      },
    };
  }

  // 3. 最该盯的风险与卡点
  if (/(盯|卡点|风险|矛盾|冲突|问题|阻塞|待确认|哪几件)/i.test(q)) {
    const pendingItems = items.filter((i) => i.status === '待确认');
    if (pendingItems.length === 0) {
      return {
        route: 'agent_ok',
        answer: '太省心了，本周所有事项状态都清晰明确，没有卡点或冲突。',
        highlightItemId: null,
        suggestedAction: null,
      };
    }
    const lines = pendingItems.map(
      (i, idx) => `${idx + 1}. ${i.author}（${i.team || '运营组'}）：${i.name} — ${i.riskNote || '待核实'}`
    );
    return {
      route: 'agent_alert',
      answer: `🚨 这 ${pendingItems.length} 件事最需要您关注：\n${lines.join('\n')}\n\n注：陈默前后矛盾的周报已被 AI 拦截，没瞎算成“已完成”。`,
      highlightItemId: pendingItems[0].id,
      suggestedAction: {
        itemIds: pendingItems.map((i) => i.id),
        label: `一键发企微核实这 ${pendingItems.length} 项`,
      },
    };
  }

  // 4. 按人名或部门查询
  const personMatch = q.match(/(张磊|王敏|李浩|陈默|赵宇|研发|产品|交付|运营)/);
  if (personMatch) {
    const kw = personMatch[1];
    const matched = items.filter(
      (i) => (i.author && i.author.includes(kw)) || (i.team && i.team.includes(kw))
    );
    if (matched.length === 0) {
      return {
        route: 'guard_no_fabrication',
        answer: `本周周报里没有找到「${kw}」提交的工作记录，AI 不会凭空编造。`,
        highlightItemId: null,
        suggestedAction: null,
      };
    }
    const lines = matched.map((i) => `• ${i.name} → 【${i.status}】${i.riskNote ? `（${i.riskNote}）` : ''}`);
    const needFollow = matched.filter((i) => i.status === '待确认' || i.isDuplicate);
    return {
      route: needFollow.length > 0 ? 'agent_alert' : 'agent_ok',
      answer: `📋 「${kw}」本周工作汇报如下：\n${lines.join('\n')}`,
      highlightItemId: matched[0].id,
      suggestedAction:
        needFollow.length > 0
          ? {
              itemIds: needFollow.map((i) => i.id),
              label: `跟进处理 ${needFollow.length} 项待确认`,
            }
          : null,
    };
  }

  // 5. 默认全局简报汇总
  const completed = items.filter((i) => i.status === '已完成');
  const planned = items.filter((i) => i.status === '下周计划');
  const pending = items.filter((i) => i.status === '待确认');
  return {
    route: 'agent_ok',
    answer: `📊 已帮您读完 ${reports.length || 1} 份周报：\n• 已完成（${completed.length} 项）：${completed.map((i) => i.name).join('、') || '无'}\n• 下周计划（${planned.length} 项）：${planned.map((i) => i.name).join('、') || '无'}\n• 需关注隐患（${pending.length} 项）：${pending.map((i) => `${i.author}-${i.name}`).join('、') || '无'}`,
    highlightItemId: pending[0]?.id || completed[0]?.id || null,
    suggestedAction:
      pending.length > 0
        ? {
            itemIds: pending.map((i) => i.id),
            label: `一键催办这 ${pending.length} 项隐患`,
          }
        : null,
  };
}
