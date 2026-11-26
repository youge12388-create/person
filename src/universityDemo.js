// 高校简章采集与双层选校规则引擎（本地脱敏演示数据，展示规则过滤、口径校验与语义复核守门机制）

export const GPA_PROFILES = [
  {
    key: 'good_4scale',
    label: '3.6 / 4.0（优秀）',
    tier: 1,
    originalScale: '4.0 分制',
    note: '锁定原始 4.0 分制为第 1 档，禁止换算为百分制；触发 985/211 占比 ≥ 40% 配比守门。',
  },
  {
    key: 'mid_100scale',
    label: '76 / 100（中等）',
    tier: 3,
    originalScale: '百分制',
    note: '锁定原始百分制为第 3 档；触发中等及以下档位配比本科“学院”保底守门（排除大专）。',
  },
  {
    key: 'weak_5scale',
    label: '2.6 / 5.0（偏弱）',
    tier: 4,
    originalScale: '5.0 分制',
    note: '锁定原始 5.0 分制为第 4 档；硬门槛自动淘汰高要求项目，优先匹配本科“学院”保底。',
  },
];

export const BUDGET_OPTIONS = [
  { value: 25000, label: '≤ 2.5 万/年' },
  { value: 50000, label: '≤ 5 万/年' },
  { value: 999999, label: '不限预算' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: '英文授课' },
  { value: 'zh', label: '中文授课' },
];

// 脱敏高校项目事实库样本
export const universityDbSamples = [
  {
    id: 'uni-a',
    schoolName: '华东理工重点大学 A',
    schoolBadge: '985 / 211',
    tierGroup: 'top_985_211',
    program: '计算机技术 MSc（英文授课）',
    language: 'en',
    tuitionAmount: 42000,
    tuitionBasis: 'academic_year',
    durationYears: 2,
    minGpaTier: 2,
    majorPolicy: 'strict_cs',
    scholarshipType: 'partial_only',
    yearStatus: 'fresh',
    sourceFile: 'uni_a_2026_brochure.pdf (P.4)',
    brochureQuote:
      'Tuition: RMB 42,000 / academic year (2-year program). Applicants must hold a Bachelor degree in Computer Science or Software Engineering. Partial scholarship only.',
  },
  {
    id: 'uni-b',
    schoolName: '首都工科名校 B',
    schoolBadge: '985 / 211',
    tierGroup: 'top_985_211',
    program: '人工智能与数据科学 MSc',
    language: 'en',
    tuitionAmount: 36000,
    tuitionBasis: 'academic_year',
    durationYears: 2,
    minGpaTier: 2,
    majorPolicy: 'related_case_by_case',
    scholarshipType: 'full_available',
    yearStatus: 'fresh',
    sourceFile: 'uni_b_intl_2026.pdf (P.7)',
    brochureQuote:
      'Annual tuition: RMB 36,000/year. CSC / University Full Scholarship eligible. Related engineering backgrounds evaluated case-by-case based on transcript.',
  },
  {
    id: 'uni-c',
    schoolName: '江南省属理工大学 C',
    schoolBadge: '省重点公办',
    tierGroup: 'public_university',
    program: '软件工程与信息系统 MSc',
    language: 'en',
    tuitionAmount: 96000,
    tuitionBasis: 'total_program',
    durationYears: 2,
    minGpaTier: 3,
    majorPolicy: 'related_case_by_case',
    scholarshipType: 'partial_only',
    yearStatus: 'historical',
    sourceFile: 'uni_c_2025_guide.pdf (P.2)',
    brochureQuote:
      'Total program tuition: RMB 96,000 for 2 years (approx. 48,000/year). Open to CS & related STEM majors upon transcript review.',
  },
  {
    id: 'uni-d',
    schoolName: '华中师范综合大学 D',
    schoolBadge: '211 公办',
    tierGroup: 'top_985_211',
    program: '教育技术与智能计算 MSc',
    language: 'zh',
    tuitionAmount: 24000,
    tuitionBasis: 'academic_year',
    durationYears: 3,
    minGpaTier: 3,
    majorPolicy: 'related_case_by_case',
    scholarshipType: 'full_available',
    yearStatus: 'fresh',
    sourceFile: 'uni_d_zh_2026.html',
    brochureQuote:
      '学费标准：24,000元/学年（学制3年），可申请全额校奖学金；接受理工及信息管理相关专业跨申，需人工复核先修课成绩单。',
  },
  {
    id: 'uni-e',
    schoolName: '沿海科技学院 E（本科）',
    schoolBadge: '公办本科“学院”',
    tierGroup: 'undergrad_college',
    program: '应用计算机与大数据 BSc/MSc 衔接',
    language: 'en',
    tuitionAmount: 20000,
    tuitionBasis: 'academic_year',
    durationYears: 2,
    minGpaTier: 4,
    majorPolicy: 'related_case_by_case',
    scholarshipType: 'full_available',
    yearStatus: 'fresh',
    sourceFile: 'uni_e_2026_brochure.pdf (P.3)',
    brochureQuote:
      'Tuition: RMB 20,000 / academic year. Fresh 2026 brochure verified. Full municipal scholarship quota available; STEM background accepted.',
  },
  {
    id: 'uni-f',
    schoolName: '西南工业大学 F',
    schoolBadge: '省属公办',
    tierGroup: 'public_university',
    program: '数据工程与应用 MSc',
    language: 'en',
    tuitionAmount: 22000,
    tuitionBasis: 'academic_year',
    durationYears: 2,
    minGpaTier: 3,
    majorPolicy: 'strict_cs',
    scholarshipType: 'full_available',
    yearStatus: 'recheck',
    sourceFile: 'uni_f_2025_notice.pdf',
    brochureQuote:
      'Tuition RMB 22,000/year. Strictly restricted to Computer Science graduates. 2026 scholarship batch pending official update (marked recheck).',
  },
  {
    id: 'uni-g',
    schoolName: '北方应用技术学院 G（本科）',
    schoolBadge: '民办本科“学院”',
    tierGroup: 'undergrad_college',
    program: '智能制造与软件应用',
    language: 'zh',
    tuitionAmount: 21000,
    tuitionBasis: 'academic_year',
    durationYears: 2,
    minGpaTier: 5,
    majorPolicy: 'related_case_by_case',
    scholarshipType: 'partial_only',
    yearStatus: 'fresh',
    sourceFile: 'uni_g_2026.html',
    brochureQuote:
      '全日制本科院校（非专科），学费 21,000元/学年，仅设部分学费减免奖学金；支持相关工科跨专业申请。',
  },
  {
    id: 'uni-h',
    schoolName: '东部交通大学 H',
    schoolBadge: '双一流公办',
    tierGroup: 'public_university',
    program: '智慧交通与控制工程',
    language: 'zh',
    tuitionAmount: 46000,
    tuitionBasis: 'total_program',
    durationYears: 2,
    minGpaTier: 2,
    majorPolicy: 'related_case_by_case',
    scholarshipType: 'full_available',
    yearStatus: 'fresh',
    sourceFile: 'uni_h_2026_pdf.pdf (P.6)',
    brochureQuote:
      '项目总学费 46,000 元（2年制，折合 23,000元/学年），中文授课，全额奖学金名额独立评审，接受机械/电子/计算机相关专业。',
  },
];

export function runUniversityMatcher(profile) {
  const gpaObj = GPA_PROFILES.find((p) => p.key === profile.gpaTier) || GPA_PROFILES[1];
  const studentTier = gpaObj.tier;

  const matched = [];
  const eliminated = [];

  for (const item of universityDbSamples) {
    const annualTuition =
      item.tuitionBasis === 'total_program'
        ? Math.round(item.tuitionAmount / item.durationYears)
        : item.tuitionAmount;

    const reasons = [];

    if (item.language !== profile.language) {
      reasons.push(`授课语言为${item.language === 'en' ? '英文' : '中文'}，与目标不符`);
    }
    if (annualTuition > profile.maxAnnualBudget) {
      const basisNote =
        item.tuitionBasis === 'total_program'
          ? `项目总学费 ¥${item.tuitionAmount.toLocaleString()}（${item.durationYears}年制折算 ¥${annualTuition.toLocaleString()}/年）`
          : `学年学费 ¥${annualTuition.toLocaleString()}/年`;
      reasons.push(`${basisNote} 超出 ¥${profile.maxAnnualBudget.toLocaleString()}/年预算上限`);
    }
    if (profile.requireFullScholarship && item.scholarshipType !== 'full_available') {
      reasons.push(
        item.scholarshipType === 'partial_only'
          ? '仅提供部分奖学金，不满足全奖硬门槛'
          : '无奖学金名额，不满足全奖硬门槛'
      );
    }
    if (profile.crossMajor && item.majorPolicy === 'strict_cs') {
      reasons.push('封闭专业清单（仅限计算机本科），跨专业一票否决');
    }
    if (studentTier - item.minGpaTier >= 2) {
      reasons.push(`原始成绩档位（第${studentTier}档）低于硬门槛第${item.minGpaTier}档两档以上`);
    }

    if (reasons.length > 0) {
      eliminated.push({
        ...item,
        annualTuition,
        reasons,
      });
      continue;
    }

    // 冲 / 稳 / 保 档位判定；严禁对未核实/待重核项目伪装“保底”
    let tierLabel = 'Match 稳妥';
    let tierCode = 'match';
    const tierDiff = studentTier - item.minGpaTier;

    if (tierDiff > 0 || item.yearStatus === 'recheck') {
      tierLabel = 'Reach 冲刺';
      tierCode = 'reach';
    } else if (tierDiff <= -1 && item.yearStatus === 'fresh') {
      tierLabel = 'Safety 保底';
      tierCode = 'safety';
    }

    const conditionalReview =
      profile.crossMajor && item.majorPolicy === 'related_case_by_case'
        ? '官网写明“related / case-by-case”（B级证据）：不武断淘汰，需人工复核成绩单先修课'
        : null;

    matched.push({
      ...item,
      annualTuition,
      tierLabel,
      tierCode,
      conditionalReview,
    });
  }

  // 排序：冲 -> 稳 -> 保
  const order = { reach: 0, match: 1, safety: 2 };
  matched.sort((a, b) => order[a.tierCode] - order[b.tierCode]);

  // 层次配比守门报告
  const topCount = matched.filter((m) => m.tierGroup === 'top_985_211').length;
  const collegeCount = matched.filter((m) => m.tierGroup === 'undergrad_college').length;
  const totalMatched = matched.length;
  const topRatio = totalMatched > 0 ? Math.round((topCount / totalMatched) * 100) : 0;

  let tierGuardReport;
  if (totalMatched === 0) {
    tierGuardReport = {
      status: 'warn',
      text: '当前硬门槛组合过于严格导致 0 所命中，建议放宽预算或取消全奖限制后重算。',
    };
  } else if (studentTier <= 2) {
    tierGuardReport =
      topRatio >= 40
        ? {
            status: 'pass',
            text: `优秀档层次守门 PASS：985/211 占比 ${topRatio}%（达标 ≥ 40% 要求）。`,
          }
        : {
            status: 'warn',
            text: `优秀档层次预警：当前条件压低了 985/211 占比至 ${topRatio}%（低于 40%），建议适当上调预算。`,
          };
  } else {
    tierGuardReport =
      collegeCount > 0
        ? {
            status: 'pass',
            text: `中弱档保底守门 PASS：已配比 ${collegeCount} 所公办/民办本科“学院”保底（已自动排除大专）。`,
          }
        : {
            status: 'warn',
            text: '中弱档保底预警：当前条件下缺少本科“学院”保底项目，建议检查语言或奖学金限制。',
          };
  }

  return {
    gpaObj,
    matched,
    eliminated,
    tierGuardReport,
  };
}

// 后台 PDF 简章采集与脏数据守门测试样本
export const collectorSamples = [
  {
    id: 'clean-pdf',
    label: '正常 PDF 简章（2026 已核实）',
    sourceUrl: 'https://intl.example-uni-b.edu.cn/2026/admissions.pdf',
    rawSnippet:
      '【PDF 第 7 页原文】2026 Master Programs: Artificial Intelligence MSc (English-taught). Tuition fee: 36,000 RMB per academic year. Duration: 2 years. Full scholarship available.',
    extractedJson: {
      school: '首都工科名校 B',
      program: 'Artificial Intelligence MSc',
      tuition_amount: 36000,
      tuition_basis: 'academic_year',
      duration_years: 2,
      year_status: 'fresh',
      evidence_grade: 'A',
    },
    hasDirtyMissingBasis: false,
  },
  {
    id: 'total-program-trap',
    label: '项目总学费口径陷阱（total_program）',
    sourceUrl: 'https://sie.example-uni-c.edu.cn/guide_2025.pdf',
    rawSnippet:
      '【PDF 第 2 页原文】Software Engineering MSc (2 Years). Program Total Tuition: RMB 96,000 (not annual). Must be normalized to 48,000/yr during budget filtering.',
    extractedJson: {
      school: '江南省属理工大学 C',
      program: 'Software Engineering MSc',
      tuition_amount: 96000,
      tuition_basis: 'total_program',
      duration_years: 2,
      year_status: 'historical',
      evidence_grade: 'A',
    },
    hasDirtyMissingBasis: false,
  },
  {
    id: 'dirty-missing-basis',
    label: '⚠️ 缺 tuition_basis 脏数据（触发拦截）',
    sourceUrl: 'https://news.example-uni-x.edu.cn/notice_881.html',
    rawSnippet:
      '【新闻公告碎片】学费 48,000 元，英文授课，学制 2 年。（原文未写明是按学年收费还是两年总学费！）',
    extractedJson: {
      school: '示例待核高校 X',
      program: 'Computer Science MSc',
      tuition_amount: 48000,
      tuition_basis: null,
      duration_years: 2,
      year_status: 'recheck',
      evidence_grade: 'C',
    },
    hasDirtyMissingBasis: true,
  },
];

export function validateBrochureIngestion(sampleId, fixApplied = false) {
  const sample = collectorSamples.find((s) => s.id === sampleId) || collectorSamples[0];
  if (sample.hasDirtyMissingBasis && !fixApplied) {
    return {
      sample,
      payload: sample.extractedJson,
      passed: false,
      errors: [
        'ERR_MISSING_TUITION_BASIS: 检测到 tuition_basis 为 null，严禁将模糊学费写入 university_db.json。',
        'GUARD_BLOCKED: 已拦截本次入库写入，原 fact_db 未被污染，请向官网原文核实口径后补全。',
      ],
      regressionStatus: 'BLOCKED (拦截脏数据写入 · 保护事实库)',
      backupFile: null,
    };
  }

  const fixedPayload =
    sample.hasDirtyMissingBasis && fixApplied
      ? {
          ...sample.extractedJson,
          tuition_basis: 'total_program',
          evidence_grade: 'B',
          year_status: 'fresh',
          manual_verified: true,
        }
      : sample.extractedJson;

  return {
    sample,
    payload: fixedPayload,
    passed: true,
    errors: [],
    regressionStatus: '37 / 37 PASS · 0 errors / 0 warnings',
    backupFile: 'university_db.bak.20261126.json (写入前已自动备份)',
  };
}
