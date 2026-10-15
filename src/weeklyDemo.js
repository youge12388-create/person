// 本地交互样例，不请求模型，也不使用真实员工或企业数据。
export const weeklySamples = [
  {
    id: 'normal', label: '正常周报', sourceId: 'W-012',
    source: '研发组：本周完成接口联调；产品组的数据看板等待字段确认；研发组下周补充同步异常的回归用例。',
    items: [
      { name: '接口联调', team: '研发组', status: '已完成', quote: '研发组：本周完成接口联调' },
      { name: '数据看板', team: '产品组', status: '待确认', quote: '产品组的数据看板等待字段确认' },
      { name: '同步异常回归', team: '研发组', status: '计划中', quote: '研发组下周补充同步异常的回归用例' },
    ],
    answer: '数据看板仍等待字段确认；接口联调已完成，同步异常回归安排在下周。',
  },
  {
    id: 'missing', label: '信息缺失', sourceId: 'W-013',
    source: '本周推进了客户数据接入，目前还有问题需要处理。',
    items: [{ name: '客户数据接入', team: null, status: '待确认', quote: '推进了客户数据接入，目前还有问题需要处理' }],
    answer: '原文没有说明负责人、具体问题和完成时间，需要补充确认；不能将“推进了”判断为已完成。',
  },
  {
    id: 'conflict', label: '状态冲突', sourceId: 'W-014',
    source: '研发组：订单接口已经完成。补充：订单接口仍有异常，尚未通过验收。',
    items: [{ name: '订单接口', team: '研发组', status: '待确认', quote: '订单接口已经完成。补充：订单接口仍有异常，尚未通过验收' }],
    answer: '同一事项同时出现“已经完成”和“尚未通过验收”，应标记待确认，保留冲突原文并交由人工复核。',
  },
];

export function weeklyStep(sample, step) {
  const records = sample.items.map((item) => ({ title: item.name, department: item.team, status: item.status, source_report: sample.sourceId }));
  const reviewCount = sample.items.filter((item) => item.status === '待确认').length;
  return [
    { note: '先保留原始输入和来源编号，处理结果不覆盖原文。', output: `周报 ${sample.sourceId} 已进入本地展示，后续节点始终保留同一来源。`, payload: { report_id: sample.sourceId, raw_text: sample.source, read_only: true } },
    { note: '把工作内容拆成事项；缺失字段留空，矛盾状态留待确认。', output: `展示 ${records.length} 条事项，${reviewCount} 条需要确认。点击事项可回查原文。`, payload: { items: records, inferred_missing_fields: false } },
    { note: '将事项与来源关联；原文没有提供的部门不会自动补齐。', output: '每条事项都保留来源编号，未知部门保持为空。', payload: { records, source_preserved: true } },
    { note: '区分完成、计划和待确认事项，让异常先进入管理视野。', output: `这份周报共 ${records.length} 条事项，其中 ${reviewCount} 条待确认。`, payload: { total: records.length, completed: sample.items.filter((item) => item.status === '已完成').length, needs_confirmation: reviewCount } },
    { note: '给出带来源的结论，明确不确定性，便于继续追问和复核。', output: `${sample.answer} 依据：${sample.sourceId}。`, payload: { answer: sample.answer, citations: [sample.sourceId], human_review: reviewCount > 0 } },
  ][step];
}
