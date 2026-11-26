// 展示素材与快捷试玩配置统一放在这里；所有沙盒样例均为脱敏演示数据。
export const caseDemos = {
  'weekly-intelligence': {
    image: './image/cases/weekly-intelligence.webp',
    imageAlt: '企业周报分析界面：工作事项、统计图表与原文来源',
    imageNote: '工作事项、组织分析与原文回查的界面展示。',
    theme: 'blue',
    capability: '系统集成 / 数据建模',
    takeaway: '40 人团队的周报从每周数小时人工翻阅，变成几分钟可下钻、每条结论都能点回周报原句核对的分析系统。',
    evidence: ['40 人组织周报自动同步', '5 段链路 + 4 类核心模型', '部门 → 员工 → 原文全链路回查'],
    previewTitle: '企微周报分析驾驶舱：结构化拆解、原文溯源与周报 Agent 对话',
    quickTryPresets: [
      { key: 'team_dups', label: '⚡ 问 Agent：谁在重复造轮子' },
      { key: 'hallucination', label: '🛡️ 测追问未写排期（防脑补）' },
      { key: 'custom_edit', label: '✍️ 录入周报让 Agent 拆解' },
    ],
  },
  'university-agent': {
    image: './image/cases/university-agent.webp',
    imageAlt: '高校研究 Agent 界面：自动简章采集、本地事实库与选校规则筛选',
    imageNote: '招生简章自动采集入表、本地事实库初筛与冲稳保报告的界面展示。',
    theme: 'sage',
    capability: 'Agent & Skill 开发 / 全自动采集与规则选校',
    takeaway: '后台挂机一天自动采集解析 10+ 所高校简章（原人工+外包一周仅 3 所），本地事实库 + 硬规则与语义双层选校，37 项回归测试全通过。',
    evidence: ['3 所/周 → 10+ 所/天（省去外包）', '网页 + PDF 简章全自动下载解析入表', '本地事实库 + 37/37 自动回归通过'],
    previewTitle: '高校简章采集与选校规则沙盒：硬规则淘汰、口径校验与语义复核',
    quickTryPresets: [
      { key: 'cross_budget', label: '⚡ 测 76 分跨专业控预算' },
      { key: 'full_scholarship', label: '⚡ 测全额奖学金硬淘汰' },
      { key: 'dirty_gate', label: '⚡ 测 PDF 脏数据拦截' },
    ],
  },
  'medical-concierge': {
    image: './image/cases/medical-concierge.webp',
    imageAlt: '双语服务助手界面：咨询对话、知识来源与人工接管',
    imageNote: '咨询对话、知识引用与人工接管的界面展示。',
    theme: 'lavender',
    capability: 'RAG 工作流 / 人工接管',
    takeaway: '用约 170 条双语 FAQ 接管 7×24 跨时区常规咨询，高风险医疗判断强制交还人工，并自动收集结构化客户线索。',
    evidence: ['约 170 条中英 FAQ', '9 类就医环节全覆盖', '高风险医疗问题人工确认'],
    previewTitle: '跨境医疗双语 RAG 沙盒：自由提问、线索自动提取与安全护栏拦截',
    quickTryPresets: [
      { key: 'rag_visa', label: '⚡ 测双语预约与陪诊 RAG' },
      { key: 'lead_extract', label: '⚡ 测对话自动提取线索卡' },
      { key: 'risk_guard', label: '🛡️ 测问病情/报价触发护栏' },
    ],
  },
};
