// 本地交互样例与纯前端规则解析 / 周报 Agent 对话引擎，不请求模型，也不使用真实员工或企业数据。

const baseWeeklySamples = [
  {
    id: 'team-overview',
    label: '全部门汇总',
    description:
      '模拟研发、产品、交付 3 个小组周报汇总：自动识别跨部门重复造轮子、连续卡点、状态矛盾与信息缺失。',
    reports: [
      {
        sourceId: 'W-201',
        author: '张工 · 研发组',
        rawText:
          '研发组：本周完成客户订单导出脚本开发，已接入测试环境；支付回调接口连续两周卡在等待法务确认字段。',
      },
      {
        sourceId: 'W-202',
        author: '王敏 · 产品组',
        rawText:
          '产品组：本周完成周报权限看板原型评审；下周计划输出移动端消息推送交互稿。',
      },
      {
        sourceId: 'W-203',
        author: '李浩 · 交付组',
        rawText:
          '交付组：独立开发了客户订单导出脚本用于客户对账；下周计划整理客户上线验收清单。',
      },
      {
        sourceId: 'W-204',
        author: '陈工 · 研发组',
        rawText:
          '研发组：订单同步已经完成。补充：订单同步异常重试尚未通过验收。',
      },
      {
        sourceId: 'W-205',
        author: '未知提交人',
        rawText: '本周推进了客户历史数据清洗，目前还有问题需要处理。',
      },
    ],
  },
  {
    id: 'normal',
    label: '正常周报',
    description: '标准周报输入：按部门拆分已完成、待确认与下周计划事项，每条均可点击回查原文。',
    reports: [
      {
        sourceId: 'W-012',
        author: '研发与产品组',
        rawText:
          '研发组：本周完成接口联调；产品组的数据看板等待字段确认；研发组下周补充同步异常的回归用例。',
      },
    ],
  },
  {
    id: 'missing',
    label: '信息缺失',
    description: '模糊表述输入：缺失部门、负责人与明确结果时保留为空，不脑补“已完成”。',
    reports: [
      {
        sourceId: 'W-013',
        author: '业务成员',
        rawText: '本周推进了客户数据接入，目前还有问题需要处理。',
      },
    ],
  },
  {
    id: 'conflict',
    label: '状态冲突',
    description:
      '矛盾表述输入：同一事项同时出现“已完成”与“未通过验收”时自动标为待确认并交人工复核。',
    reports: [
      {
        sourceId: 'W-014',
        author: '研发组',
        rawText: '研发组：订单接口已经完成。补充：订单接口仍有异常，尚未通过验收。',
      },
    ],
  },
];

const TEAM_PREFIX_RE = /^(研发组|产品组|交付组|运营组|客服组|测试组|法务组|设计组)[：:]\s*/;
const INLINE_TEAM_RE = /(研发组|产品组|交付组|运营组|客服组|测试组|法务组|设计组)(?:的|本周|下周)/;
const COMPLETE_RE = /(已经?完成|本周完成|已上线|已完成|已闭环|已接入|通过验收|已交付|开发了)/;
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
  } else if (clean.length > 20) {
    clean = `${clean.slice(0, 20)}…`;
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
      duplicatePairs.push({
        topic: kw,
        items: list,
      });
    }
  }

  return { dupIds, duplicatePairs };
}

/**
 * 纯前端周报结构化解析器：
 * 严格遵循“原文只读不覆盖、缺失字段留空、矛盾/模糊表述留待确认”。
 */
export function parseWeeklyReportText(
  rawText,
  sourceId = 'W-CUSTOM',
  fallbackTeam = null,
  author = '现场提交人'
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
    let conflictReason = null;
    const missingFields = [];

    if (hasComplete && hasRisk) {
      status = '待确认';
      conflictReason = '前后状态矛盾（同时出现完成与异常/未通过）';
    } else if (hasRisk) {
      status = '待确认';
      conflictReason = sentence.includes('连续') ? '连续卡点阻塞，需跨部门确认' : '存在未解决风险或等待确认';
    } else if (hasPlan && !hasComplete) {
      status = '计划中';
    } else if (hasComplete) {
      status = '已完成';
    } else if (hasVague) {
      status = '待确认';
      conflictReason = '仅有“推进了/跟进中”等模糊表述，缺少明确结论与时间';
    } else {
      status = '待确认';
      conflictReason = '语义未明确交付结果，留待人工复核';
    }

    if (!team) {
      missingFields.push('负责部门');
    }

    const name = extractTitle(sentence);
    return {
      id: `${sourceId}-${idx + 1}`,
      sourceId,
      author,
      name,
      team,
      status,
      quote: sentence,
      conflictReason,
      missingFields,
      isDuplicate: false,
    };
  });
}

export function parseSampleReports(reports) {
  const allItems = [];
  for (const rep of reports) {
    const parsed = parseWeeklyReportText(rep.rawText, rep.sourceId, null, rep.author);
    allItems.push(...parsed);
  }
  const { dupIds, duplicatePairs } = detectDuplicateKeys(allItems);
  const enriched = allItems.map((item) => ({
    ...item,
    isDuplicate: dupIds.has(item.id),
  }));
  return { items: enriched, duplicatePairs };
}

export const weeklySamples = baseWeeklySamples.map((sample) => {
  const { items, duplicatePairs } = parseSampleReports(sample.reports);
  return {
    ...sample,
    sourceId: sample.reports.map((r) => r.sourceId).join(' / '),
    source: sample.reports.map((r) => `[${r.sourceId}] ${r.rawText}`).join('\n'),
    items,
    duplicatePairs,
  };
});

export const weeklyAgentPrompts = [
  {
    key: 'dups',
    label: '谁在重复造轮子？',
    query: '检查一下各小组本周有没有跨部门重复开发或重复造轮子的工作？',
  },
  {
    key: 'blockers',
    label: '汇总卡点与矛盾项',
    query: '本周有哪些卡点阻塞、前后状态矛盾或待确认事项？',
  },
  {
    key: 'rd_progress',
    label: '查研发组进展与风险',
    query: '研发组本周完成了哪些工作，还有什么风险需要重点盯？',
  },
  {
    key: 'hallucination_test',
    label: '🛡️ 追问数据清洗谁负责/哪天上线',
    query: '客户历史数据清洗是谁负责的？哪天能上线？',
  },
];

function toCitation(item) {
  return {
    sourceId: item.sourceId,
    author: item.author || item.team || '未知提交人',
    name: item.name,
    quote: item.quote,
    itemId: item.id,
  };
}

/**
 * 周报管理问答 Agent 路由引擎：
 * 严格遵循“仅依据周报原文回答；原文没写负责人、时间或指标时明确拒绝脑补并建议派发企微追问”。
 */
export function askWeeklyAgent(queryText, items, reports = [], duplicatePairs = []) {
  const q = String(queryText || '').trim();
  const { duplicatePairs: liveDups } =
    duplicatePairs.length > 0 ? { duplicatePairs } : detectDuplicateKeys(items);

  // 1. 防幻觉边界测试：追问未写明负责人、上线日期、预算、准确率等原文缺失字段
  const asksWhoOrWhen = /(谁|负责人|哪天|什么时候|时间|几号|排期|上线|预算|准确率|KPI|转化率)/i.test(q);
  const mentionsCleaningOrMissing =
    /(数据清洗|历史数据|未知|数据接入|未提供|缺)/i.test(q) ||
    items.some((i) => !i.team && q.includes(i.name.slice(0, 4)));

  if (asksWhoOrWhen && (mentionsCleaningOrMissing || /(预算|准确率|KPI|转化率)/i.test(q))) {
    const missingItems = items.filter((i) => !i.team || i.status === '待确认');
    const targetItem =
      items.find((i) => i.quote.includes('数据清洗')) ||
      missingItems[0] ||
      items[0];

    if (targetItem && (!targetItem.team || targetItem.status === '待确认')) {
      return {
        route: 'guard_no_fabrication',
        answer: `⚠️ 原文未提供该信息，系统拒绝脑补。\n\n检索 [${targetItem.sourceId}] 原句仅写：“${targetItem.quote}”。\n• 负责部门 / 人员：原文留空（未写明谁负责）\n• 明确完成状态或上线日期：原文未提及，不能把“推进了”判断为已完成\n\n建议直接点击下方按钮向提交人派发企微核实卡补齐字段。`,
        citations: [toCitation(targetItem)],
        suggestedAction: {
          type: 'resolve_items',
          itemIds: [targetItem.id],
          label: `派发企微追问 [${targetItem.sourceId}] 负责人与排期`,
        },
      };
    }
  }

  // 2. 跨部门重复劳动检测
  if (/(重复|造轮子|撞车|导出脚本|相同|一样)/i.test(q)) {
    if (liveDups.length === 0) {
      return {
        route: 'agent_ok',
        answer: '在当前周报样本中，暂未检测到跨部门重复开发同一功能的记录。',
        citations: [],
        suggestedAction: null,
      };
    }
    const pair = liveDups[0];
    const lines = pair.items.map(
      (i) => `• [${i.sourceId}] ${i.author || i.team}：${i.name}（${i.status}）`
    );
    return {
      route: 'agent_alert',
      answer: `已识别到跨部门重复投入 —— 主题「${pair.topic}」在 ${pair.items.length} 个团队同时出现：\n${lines.join('\n')}\n\n建议：立即拉通双方复用同一套脚本，避免重复维护两份对账逻辑。`,
      citations: pair.items.map(toCitation),
      suggestedAction: {
        type: 'resolve_items',
        itemIds: pair.items.map((i) => i.id),
        label: '一键拉通研发组与交付组合并排期',
      },
    };
  }

  // 3. 卡点、状态矛盾、异常排查
  if (/(卡点|阻塞|矛盾|冲突|异常|风险|待确认|问题|未通过)/i.test(q)) {
    const pendingItems = items.filter((i) => i.status === '待确认');
    if (pendingItems.length === 0) {
      return {
        route: 'agent_ok',
        answer: '当前周报中所有事项状态均已明确，未发现待确认或冲突阻塞项。',
        citations: [],
        suggestedAction: null,
      };
    }
    const lines = pendingItems.map(
      (i, idx) =>
        `${idx + 1}. [${i.sourceId}] ${i.name}（${i.team ?? '部门未提供'}）— ${i.conflictReason || '待确认'}`
    );
    return {
      route: 'agent_alert',
      answer: `共排查出 ${pendingItems.length} 项待人工确认 / 卡点风险：\n${lines.join('\n')}\n\n其中矛盾句已保留原始上下文并拒绝自动标“已完成”，点击下方引用可逐条回查原句。`,
      citations: pendingItems.map(toCitation),
      suggestedAction: {
        type: 'resolve_items',
        itemIds: pendingItems.map((i) => i.id),
        label: `一键派发 ${pendingItems.length} 张企微核实卡`,
      },
    };
  }

  // 4. 按部门 / 成员精准查询
  const teamMatch = q.match(/(研发组|产品组|交付组|研发|产品|交付|张工|王敏|李浩|陈工)/);
  if (teamMatch) {
    const kw = teamMatch[1].replace(/组$/, '');
    const matched = items.filter(
      (i) => (i.team && i.team.includes(kw)) || (i.author && i.author.includes(kw))
    );
    if (matched.length === 0) {
      return {
        route: 'guard_no_fabrication',
        answer: `当前周报原文中未找到「${teamMatch[1]}」的相关工作记录，系统不做猜测补充。`,
        citations: [],
        suggestedAction: null,
      };
    }
    const lines = matched.map(
      (i) =>
        `• [${i.sourceId}] ${i.name} → 【${i.status}】${i.conflictReason ? `（${i.conflictReason}）` : ''}`
    );
    const pendingInTeam = matched.filter((i) => i.status === '待确认' || i.isDuplicate);
    return {
      route: pendingInTeam.length > 0 ? 'agent_alert' : 'agent_ok',
      answer: `为您检索到「${teamMatch[1]}」共 ${matched.length} 条记录（均已溯源原句）：\n${lines.join('\n')}`,
      citations: matched.map(toCitation),
      suggestedAction:
        pendingInTeam.length > 0
          ? {
              type: 'resolve_items',
              itemIds: pendingInTeam.map((i) => i.id),
              label: `跟进处置该组 ${pendingInTeam.length} 项异常/重复`,
            }
          : null,
    };
  }

  // 5. 默认全局工作台汇总
  const completed = items.filter((i) => i.status === '已完成');
  const planned = items.filter((i) => i.status === '计划中');
  const pending = items.filter((i) => i.status === '待确认');
  return {
    route: 'agent_ok',
    answer: `本周共解析 ${reports.length || 1} 份企微周报、沉淀 ${items.length} 条结构化事项：\n• 已完成（${completed.length}）：${completed.map((i) => i.name).join('、') || '无'}\n• 下周计划（${planned.length}）：${planned.map((i) => i.name).join('、') || '无'}\n• 待确认/卡点（${pending.length}）：${pending.map((i) => i.name).join('、') || '无'}\n${liveDups.length > 0 ? `\n⚠️ 另检测到 ${liveDups.length} 组跨部门重复开发（${liveDups.map((d) => d.topic).join('、')}）。` : ''}`,
    citations: [...pending, ...completed.slice(0, 2)].map(toCitation),
    suggestedAction:
      pending.length > 0
        ? {
            type: 'resolve_items',
            itemIds: pending.map((i) => i.id),
            label: `批量派发 ${pending.length} 项待确认核实卡`,
          }
        : null,
  };
}

// 兼容旧引用保留
export const managerQuestions = weeklyAgentPrompts;
export function answerManagerQuestion(questionKey, items, duplicatePairs = []) {
  const prompt = weeklyAgentPrompts.find((p) => p.key === questionKey) || weeklyAgentPrompts[0];
  return askWeeklyAgent(prompt.query, items, [], duplicatePairs);
}
