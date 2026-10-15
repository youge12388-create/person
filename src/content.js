export const projects = [
  {
    id: 'weekly-intelligence',
    number: '01',
    category: 'ENTERPRISE SYSTEMS',
    title: '企业微信周报智能分析平台',
    englishTitle: 'Weekly Intelligence Platform',
    summary: '把分散的员工周报转成可追溯的工作事项，并支持管理者按组织层级分析与提问。',
    scope: '约 40 人组织',
    role: '独立负责需求梳理、架构设计与核心功能开发',
    deliverables: ['企业微信组织与周报的全量 / 增量同步链路', '员工、部门、原始周报与工作事项四类数据模型', '关联原文的事项分析、组织下钻与管理问答'],
    stack: ['企业微信 API', 'FastAPI', 'Next.js', 'PostgreSQL', 'Structured Output'],
    situation: '管理者需要逐人阅读周报，才能掌握团队在做什么、哪些事项反复出现，以及任务卡点在哪里。原始内容是自然语言，难以直接汇总，也容易在二次整理时失去上下文。',
    approach: '将原有阅读流程改造成一条有来源、有状态、可下钻的处理链路：先同步原始周报，再抽取工作事项，最后把结构化数据用于分析与问答。',
    workflow: ['数据同步', 'AI 结构化', '事项沉淀', '数据分析', '管理问答'],
    architecture: [
      ['Connector', '对接企业微信组织架构与周报，支持全量 / 增量同步、失败重试和日志记录。'],
      ['Raw Data', '保留周报原文，作为结构化结果和问答引用的可追溯来源。'],
      ['Processor', '通过 Structured Output 提取事项、分类、状态、计划和置信度等字段。'],
      ['Core Business Data', '沉淀员工、部门、原始周报与工作事项四类核心数据模型。'],
    ],
    decisions: [
      ['原文保持只读', '结构化结果不能覆盖周报原文，分析和问答可以回到原始上下文核对。'],
      ['不确定时留待确认', '要求模型不补充原文没有的信息；无法判断的事项进入待确认状态。'],
      ['先定位异常，再查看证据', '支持公司、部门、员工到原始周报的多层级下钻，用于识别重复内容、长期未完成事项、重点工作和潜在卡点。'],
    ],
    verification: [
      '同步流程覆盖全量与增量场景，并包含失败重试、日志记录和原始数据追溯。',
      '管理问答关联员工、事项、周报和时间周期，回答可以回到具体来源核查。',
      '数据层按 Connector、Raw Data、Processor、Core Business Data 拆分，为后续接入 OA、审批和企业文档预留边界。',
    ],
  },
  {
    id: 'university-agent',
    number: '02',
    category: 'RESEARCH & AGENTS',
    title: '高校数据研究与国际学生选校 Agent',
    englishTitle: 'University Research & Matching Agent',
    summary: '把高校招生资料研究整理成可核验的数据流程，再由规则与模型协同完成候选项目筛选。',
    scope: '面向约 196 所高校的数据建设场景',
    role: '流程抽象、Research Skill 与选校 Agent 设计、端到端评估',
    deliverables: ['官方来源优先的 Research Skill 与结构化字段', '确定性规则过滤与语义判断分离的匹配流程', '携带来源、年份与核验状态的候选数据'],
    repository: { url: 'https://github.com/youge12388-create/school', label: '相关代码 · 高校筛查' },
    stack: ['Web Research', 'Structured Output', 'Rule Engine', 'Excel', 'Agent Evaluation'],
    situation: '高校项目信息分散在官网、国际教育学院页面和不同年份的招生简章中。人工流程需要依次找学校、查官网、定位简章、核对年份、提取字段并填写 Excel，信息来源和时效都需要逐项检查。',
    approach: '先将研究过程抽象成可重复的 Skill，再把学生筛选拆为确定性规则过滤和语义判断两步，让数据采集、核验和匹配各自承担清晰职责。',
    workflow: ['定位官方来源', '核对入学年份', '提取结构化字段', '规则过滤', '语义判断', '回归评估'],
    architecture: [
      ['Research Priority', '按官方来源、目标入学年份、最新版本排序，优先检索高校官网、国际教育学院和招生简章。'],
      ['Structured Data', '抽取专业、学费、授课语言、GPA、语言要求、申请材料、截止日期和奖学金等字段，并保存来源链接、数据年份与核验状态。'],
      ['Rule Engine', '先筛查 GPA、语言、专业背景和预算等确定性条件，减少语义模型处理不必要候选项。'],
      ['Agent Evaluation', '再由模型判断存在语义空间的要求，并用随机学生端到端场景持续回归。'],
    ],
    decisions: [
      ['让官方资料优先', '将来源质量、年份和版本纳入检索优先级，降低过期资料及第三方内容对结果的影响。'],
      ['规则与模型分工', 'GPA、语言、预算等明确条件由规则过滤；专业背景等语义要求交由模型判断。'],
      ['让数据状态可见', '每条院校数据标记为 Fresh、Needs Recheck 或 Unverified，避免把未核验数据当作确定事实。'],
    ],
    verification: [
      '为抽取字段保留来源链接、数据年份与核验状态，便于回查。',
      '使用随机学生场景端到端检查 GPA、专业背景、语言、预算、入学年份、奖学金与重复院校等情况。',
      '“约 196 所”描述的是数据建设的目标场景范围，不代表已完成全部院校采集。',
    ],
  },
  {
    id: 'medical-concierge',
    number: '03',
    category: 'BILINGUAL AI SERVICE',
    title: '跨境医疗双语 AI 客服',
    englishTitle: 'Medical Travel Assistant',
    summary: '面向欧美国际患者来华就医咨询，把知识检索、需求收集与人工接管连接成一条服务链路。',
    scope: '中英双语 · 约 170 条 FAQ',
    role: '咨询流程拆解、知识库整理、RAG 工作流与线索分流设计',
    deliverables: ['覆盖服务流程的约 170 条中英双语 FAQ', '基于 Dify 的知识检索与受约束回答流程', '从咨询、需求收集到顾问接管的服务衔接'],
    repository: { url: 'https://github.com/youge12388-create/chatbot', label: '相关代码 · AI 客服' },
    stack: ['LLM', 'Dify', 'RAG', 'Prompt Engineering', 'Workflow Design'],
    situation: '患者咨询不只涉及医院和医生，还可能覆盖病历材料、费用、预约、签证、翻译陪诊、住宿与紧急情况。只回答 FAQ 无法收集后续服务所需信息，也不适合让模型直接作医疗判断。',
    approach: '将咨询拆为意图识别、知识检索、受约束回答和留资 / 转人工几步，并把常见问题与后续服务流程一起整理。',
    workflow: ['用户提问', '意图识别', 'RAG 检索', '受约束回答', '留资 / 转人工'],
    architecture: [
      ['Knowledge Base', '整理约 170 条问答，覆盖医院与医生匹配、材料、费用、预约、签证、陪诊、住宿和紧急分流等场景。'],
      ['RAG Workflow', '使用 Dify 构建检索流程，通过知识库与 Prompt 限定回答范围。'],
      ['Lead Capture', '提取国家 / 地区、医疗需求和联系方式，用于后续顾问跟进。'],
      ['Human Handoff', '对知识库无法回答或需要专业判断的问题转交人工顾问。'],
    ],
    decisions: [
      ['按服务环节组织知识', '内容不止按问题分类，还覆盖网站咨询、病历提交、资料提取、翻译摘要、医院科室匹配、费用咨询、签证行程、来华服务和出院随访。'],
      ['把高风险事项交给人工', '医院推荐、医疗判断和具体费用设置人工确认机制，避免模型直接输出未经核验的信息。'],
      ['回答之外收集后续需求', '将患者地区、医疗需求和联系方式作为线索字段，形成从咨询到顾问处理的交接。'],
    ],
    verification: [
      '依据知识库覆盖范围处理常见问题；无依据的问题进入人工流程。',
      '咨询流程保留留资和转人工出口，支持后续服务团队接手。',
      '约 170 条 FAQ 为资料规模描述；不将其表述为准确率、解决率或患者转化结果。',
    ],
  },
];

export const experience = [
  {
    period: '2026.01 — 至今',
    title: 'AI 产品专员',
    company: '锦囊妙计企业管理有限公司',
    details: '负责 AI 工作流程 SOP、提示词模板、工具操作流程与培训资料，支持企业 AI 工具落地。',
  },
  {
    period: '2025.01 — 2025.11',
    title: '运营自动化支持实习生',
    company: '深圳航世科技有限公司',
    details: '搭建订单自动化与评论数据流程，支持运营数据采集、清洗和分析。',
  },
];

export const education = {
  school: '广东机电职业技术学院',
  major: '软件技术',
  period: '2022.09 — 2025.06',
};

export const contact = {
  email: 'you123886@163.com',
  wechat: 'python59',
  github: 'https://github.com/youge12388-create',
};
