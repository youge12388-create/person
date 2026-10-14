// 展示素材统一放在这里；替换真实截图、示例数据及文案时无需修改展示组件。
// sample 为虚构演示数据，不用于表达项目成果。
export const caseDemos = {
  'weekly-intelligence': {
    image: './image/cases/weekly-intelligence.webp',
    imageAlt: '企业周报分析平台概念界面：工作事项、统计图表与原文来源',
    imageCaption: '概念界面 · 示例素材',
    imageNote: 'AI 生成的概念界面，用于展示产品思路；不代表实际产品截图。',
    theme: 'blue',
    capability: '系统集成 / 数据建模',
    takeaway: '把自然语言变成业务数据，让每个结论都能回到原文。',
    evidence: ['5 段处理链路', '4 类核心数据模型', '原文与结果可追溯'],
    previewTitle: '从一份周报，到可追溯的工作事项',
    sample: {
      source: '示例周报 W-012：本周完成接口联调；数据看板等待字段确认；下周补充同步异常的回归用例。',
      items: [
        { name: '接口联调', team: '研发', status: '已完成' },
        { name: '数据看板', team: '产品', status: '待确认' },
        { name: '同步异常回归', team: '研发', status: '计划中' },
      ],
    },
    steps: [
      { note: '同步周报时保留原始文本与来源编号。', output: '原文进入只读记录，后续提取不覆盖来源。', payload: { report_id: 'demo-W-012', source: '示例周报', mode: 'read_only' } },
      { note: '将原文拆成工作事项，不补充原文没有的信息。', output: '提取 3 条示例事项，保留状态与来源。', payload: { title: '数据看板', status: 'needs_confirmation', source_report: 'demo-W-012' } },
      { note: '事项与员工、部门、周报建立关联。', output: '同一事项可以从团队视角下钻到原文。', payload: { item_id: 'demo-I-02', department: '产品', report_id: 'demo-W-012' } },
      { note: '按状态和组织聚合，让待确认事项可见。', output: '示例列表中有 1 条待确认事项，点击记录可查看来源。', payload: { sample_items: 3, needs_confirmation: 1, source_attached: true } },
      { note: '回答管理问题时引用对应事项和周报。', output: '“数据看板等待字段确认。”依据：示例周报 W-012。', payload: { answer: '数据看板等待字段确认', citations: ['demo-W-012'], human_review: true } },
    ],
  },
  'university-agent': {
    image: './image/cases/university-agent.webp',
    imageAlt: '高校研究 Agent 概念界面：项目筛选、候选院校与来源核验',
    imageCaption: '概念界面 · 示例素材',
    imageNote: 'AI 生成的概念界面，院校与匹配数值均为示例；不代表真实选校结果。',
    theme: 'sage',
    capability: 'Agent 设计 / 规则与模型协作',
    takeaway: '先核验信息，再筛选候选；规则负责约束，模型处理语义。',
    evidence: ['官方资料优先', '规则与语义判断分离', '来源、年份与状态保留'],
    previewTitle: '从分散的招生资料，到可核验的候选清单',
    sample: {
      source: '示例资料 U-021：以下院校名称、项目与核验记录均为虚构，仅演示数据状态和处理结构。',
      items: [
        { name: '北岸学院 · 数据科学', team: '已核验', status: 'Fresh' },
        { name: '湖畔学院 · 软件工程', team: '待复核', status: 'Needs Recheck' },
        { name: '西岭学院 · 信息系统', team: '未核验', status: 'Unverified' },
      ],
    },
    steps: [
      { note: '先确认来源类型，避免把转载内容直接当作依据。', output: '为示例候选记录来源类型和文档编号。', payload: { document_id: 'demo-U-021', source_type: 'official_brochure', institution: '虚构北岸学院' } },
      { note: '把入学年份与资料版本一起保存。', output: '示例资料标注目标年份，缺失版本的记录需要复核。', payload: { intake_year: '示例年份', version: 'demo-v1', verification: 'Fresh' } },
      { note: '字段提取与来源核验分开，未知字段不猜测。', output: '示例专业、授课语言等字段保留来源；未提供的信息留空。', payload: { program: '数据科学（示例）', language: 'English', tuition: null, source_id: 'demo-U-021' } },
      { note: '确定性要求先交给规则处理。', output: '只对已核验的示例条目演示规则流程，不生成真实选校建议。', payload: { stage: 'rule_filter', verified_records_only: true, mode: 'demonstration' } },
      { note: '存在语义空间的要求，再交给模型解释。', output: '候选理由与来源绑定，不把模型判断写成录取结论。', payload: { stage: 'semantic_review', explanation_required: true, admission_prediction: false } },
      { note: '用预算、语言、年份与重复记录等场景回归。', output: '演示清单保留 Fresh、Needs Recheck、Unverified 三种状态。', payload: { checks: ['年份', '语言', '预算', '重复院校'], result: '示例流程，非评估成绩' } },
    ],
  },
  'medical-concierge': {
    image: './image/cases/medical-concierge.webp',
    imageAlt: '双语服务助手概念界面：咨询对话、知识来源与人工接管',
    imageCaption: '概念界面 · 示例素材',
    imageNote: 'AI 生成的服务界面示意，不包含患者信息，也不提供医疗建议。',
    theme: 'lavender',
    capability: 'RAG 工作流 / 人工接管',
    takeaway: '让知识回答与顾问交接连起来，把不确定性留给人工确认。',
    evidence: ['约 170 条 FAQ', '中英双语咨询', '高风险事项人工确认'],
    previewTitle: '从服务咨询，到有边界的人工交接',
    sample: {
      source: '示例知识片段 K-008：来访前可向服务顾问咨询预约准备和翻译安排。费用与诊疗问题需由相关专业人员确认。',
      items: [
        { name: '预约准备', team: '服务咨询', status: '知识检索' },
        { name: '翻译安排', team: '服务咨询', status: '知识检索' },
        { name: '费用与诊疗', team: '专业判断', status: '人工确认' },
      ],
    },
    steps: [
      { note: '理解咨询主题，本演示不收集任何个人信息。', output: '示例问题：“来访前可以咨询哪些准备事项？”', payload: { question: '来访前的准备事项', language: 'zh', personal_data: 'none' } },
      { note: '区分常规服务咨询与需要专业判断的问题。', output: '预约与翻译进入服务知识检索；费用与诊疗进入人工确认。', payload: { intent: 'service_preparation', medical_decision: false, route: 'knowledge_search' } },
      { note: '先查知识库，再依据检索内容组织回答。', output: '检索到示例知识片段 K-008，并保留引用。', payload: { document_id: 'demo-K-008', topic: '预约准备与翻译安排', citation_required: true } },
      { note: '回答限定在服务信息，不提供诊断或治疗建议。', output: '“可联系顾问了解预约准备与翻译安排。费用与诊疗请由专业人员确认。”', payload: { answer_scope: 'service_information', citation: 'demo-K-008', medical_advice: false } },
      { note: '需要专业判断或缺少依据时，进入人工接管。', output: '示例状态：待顾问确认。本地演示不发送请求或创建线索。', payload: { status: 'human_review_required', submitted: false, mode: 'local_demo' } },
    ],
  },
};
