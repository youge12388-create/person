// 展示素材统一放在这里；替换真实截图、示例数据及文案时无需修改展示组件。
// sample 为虚构演示数据，仅用于演示数据结构与处理逻辑。
export const caseDemos = {
  'weekly-intelligence': {
    image: './image/cases/weekly-intelligence.webp',
    imageAlt: '企业周报分析界面：工作事项、统计图表与原文来源',
    imageNote: '工作事项、组织分析与原文回查的界面展示。',
    theme: 'blue',
    capability: '系统集成 / 数据建模',
    takeaway: '40 人团队的周报从每周数小时人工翻阅，变成几分钟可下钻、每条结论都能点回周报原句的分析系统。',
    evidence: ['40 人组织周报自动同步', '5 段链路 + 4 类核心模型', '部门 → 员工 → 原文全链路回查'],
    previewTitle: '从一份自然语言周报，到可回查原文的工作事项',
  },
  'university-agent': {
    image: './image/cases/university-agent.webp',
    imageAlt: '高校研究 Agent 界面：自动简章采集、本地事实库与选校规则筛选',
    imageNote: '招生简章自动采集入表、本地事实库初筛与冲稳保报告的界面展示。',
    theme: 'sage',
    capability: 'Agent & Skill 开发 / 全自动采集与规则选校',
    takeaway: '后台挂机一天自动采集解析 10+ 所高校简章（原人工+外包一周仅 3 所），本地事实库 + 硬规则与语义双层选校，37 项回归测试全通过。',
    evidence: ['3 所/周 → 10+ 所/天（省去外包）', '网页 + PDF 简章全自动下载解析入表', '本地事实库 + 37/37 自动回归通过'],
    previewTitle: '从后台全自动采集解析 PDF 简章，到可核验的冲/稳/保选校报告',
    sample: {
      source: '示例资料 U-021：以下院校名称与候选条目仅为演示数据结构，展示采集入库与三级时效守门逻辑。',
      items: [
        { name: '示例院校 A · 计算机技术硕士', team: '当年新简章 · 官网 PDF 已核实', status: 'fresh' },
        { name: '示例院校 B · 数据科学（total_program）', team: '上一批次已核实 · 预匹配候选', status: 'historical' },
        { name: '示例院校 C · 相关专业（case-by-case）', team: '开放专业表述 · 需看成绩单确认', status: 'recheck' },
      ],
    },
    steps: [
      {
        note: '针对高校官网栏目混乱、简章多藏在新闻和 PDF 附件里的痛点，采集 Skill 在后台自动寻源、下载并解析网页与 PDF。',
        output: '单次后台任务自动完成多所高校官网寻源与 PDF 简章文本解析，彻底替代人工一页页翻找。',
        payload: {
          skill: 'university-program-collector',
          mode: 'background_auto',
          sources_parsed: ['official_web_page', 'admissions_brochure.pdf'],
          throughput_compare: '3 schools/week (manual+outsourced) -> 10+ schools/day (auto)',
        },
      },
      {
        note: '按统一字段规范抽取专业、学制、原始分制要求、奖学金和学费计费口径，自动写入表格与本地事实库 university_db.json。',
        output: '强制要求填写学费计费口径（tuition_basis：学年 vs 项目总学费），拦截缺失口径的脏数据，写入前自动备份。',
        payload: {
          db_file: 'university_db.json',
          program: 'Artificial Intelligence MSc (示例)',
          tuition: 200000,
          tuition_basis: 'total_program',
          auto_backup: true,
        },
      },
      {
        note: '选校匹配启动阶段零：严禁把整库塞进大模型撑爆上下文，强制先调用 Python 脚本 db_filter.py 在 10 秒内查本地库。',
        output: '10 秒内先筛出本地事实库已有学校，只针对未覆盖或过期缺口派发并行搜索补齐，省时又省 Token。',
        payload: {
          command: 'python db_filter.py filter --target-year 2027',
          latency: '<10s',
          context_protection: 'no_raw_full_db_in_prompt',
        },
      },
      {
        note: '严格区分【硬性条件】与【偏好条件】：锁定原始满分制 GPA 划分五档（禁止跨分制换算），不满足硬门槛直接淘汰。',
        output: '同时按学生成绩档位对称配比院校层次：好学生保障 985/211 ≥40%，中等及以下强制配比本科“学院”保底（排除专科）。',
        payload: {
          hard_filters: ['original_gpa_tier', 'scholarship_full_vs_partial', 'teaching_language', 'tuition_budget', 'nationality'],
          tier_balance_v2_4_1: { good_tier_top_uni_min: '40%', mid_or_lower_college_min: '30%-40%' },
        },
      },
      {
        note: '遇到官网写“related field / case-by-case”开放表述时不武断淘汰，标为 conditional + B 级证据交人工复核；按目标年份拆出三级状态。',
        output: '将候选拆分为 fresh（当年已核实）、historical（旧批次预匹配）与 recheck（待重核），奖学金与录取年份独立标红预警。',
        payload: {
          major_matching: 'conditional_review_by_transcript',
          evidence_grade: 'B',
          year_status: ['fresh', 'historical', 'recheck'],
          scholarship_year_independent: true,
        },
      },
      {
        note: '由 generate_report.py 渲染带官方来源链接与红字风险提示的冲/稳/保 HTML 报告，全链路通过 37/37 自动回归测试。',
        output: '拦截数字录取概率与未核实项目伪装成“稳/保”，HTML 报告生成器自检与 37 项端到端回归全部 PASS。',
        payload: {
          generator: 'generate_report.py',
          regression_tests: '37 / 37 PASS',
          db_validate: '0 errors / 0 warnings',
          output_format: 'Reach / Match / Safety HTML Report',
        },
      },
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
    previewTitle: '从跨时区重复咨询，到有安全边界的人工交接',
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
