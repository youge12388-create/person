// 跨境医疗双语 RAG 客服与安全护栏本地沙盒引擎
// 严格遵守：仅基于脱敏示例知识片段应答；高风险医疗诊断与精确报价强制拦截并转交人工顾问，不提交或存储真实患者数据。

export const medicalFaqEntries = [
  {
    id: 'K-008',
    category: '预约与签证',
    questionZh: '来华就医预约需要准备什么材料和签证？',
    questionEn: 'What documents and visa are required before traveling for medical care?',
    answerZh:
      '常规来华预约需准备护照首页、近期影像/病理报告及主诉摘要；我们的双语协调员可协助出具医院预约函以配合办理来华签证（如 S2/M 类或医疗旅游便利通道）。具体签证批复以使领馆规定为准。',
    answerEn:
      'For initial appointment scheduling, please prepare your passport bio page, recent imaging/pathology reports, and a brief symptom summary. Our coordinator can assist with an official hospital invitation letter for your visa application, subject to embassy rules.',
    keywords: ['预约', '签证', '材料', '准备', '护照', 'appointment', 'visa', 'document', 'prepare', 'travel'],
  },
  {
    id: 'K-014',
    category: '病历翻译与陪诊',
    questionZh: '提供英文病历翻译和全程住院陪诊吗？',
    questionEn: 'Do you provide medical record translation and in-hospital interpretation?',
    answerZh:
      '是的。服务团队提供中英双语病历摘要翻译与院内陪同翻译服务，覆盖挂号、门诊面诊、检查引导与出院单据解读，帮助跨时区患者顺畅沟通。',
    answerEn:
      'Yes. We provide bilingual medical record summary translation and dedicated on-site interpreters covering registration, doctor consultations, diagnostic tests, and discharge summaries.',
    keywords: ['翻译', '陪诊', '英文', '病历', '沟通', '语言', 'translat', 'interpret', 'language', 'companion', 'record'],
  },
  {
    id: 'K-032',
    category: '院区与住宿衔接',
    questionZh: '落地后的接机、住宿与复诊随访如何安排？',
    questionEn: 'How are airport pickup, accommodation, and follow-up arranged?',
    answerZh:
      '可在确认就诊日期后预约接机与医院周边酒店协调，并在出院离华后提供线上复诊资料转交与报告翻译跟进。',
    answerEn:
      'Once your appointment date is confirmed, we can coordinate airport pickup, nearby hotel options, and remote post-discharge report follow-up.',
    keywords: ['接机', '住宿', '酒店', '复诊', '随访', 'airport', 'hotel', 'follow-up', 'pickup'],
  },
  {
    id: 'K-056',
    category: '线索交接标准',
    questionZh: '如何由人工医疗顾问接管我的个性化需求？',
    questionEn: 'How can a human medical coordinator take over my specific request?',
    answerZh:
      '您只需在对话中告知所在国家/地区、大致就医方向及方便联系的邮箱或 WhatsApp/微信，系统会整理为结构化咨询摘要，交由人工顾问在对应时区工作时段对接确认。',
    answerEn:
      'Simply share your country/city, general medical need, and preferred email or WhatsApp/WeChat. We will compile a structured summary for a human coordinator to follow up in your time zone.',
    keywords: ['人工', '顾问', '联系', '邮箱', '对接', '时间', 'human', 'coordinator', 'contact', 'schedule'],
  },
];

export const medicalPresetPrompts = [
  {
    key: 'prep_visa',
    labelZh: '预约与签证',
    labelEn: 'Booking & Visa',
    textZh: '来华看病需要准备哪些材料？可以协助办理医疗签证邀请函吗？',
    textEn: 'What documents are needed for booking, and can you help with a medical visa letter?',
  },
  {
    key: 'interpreter',
    labelZh: '翻译与陪诊',
    labelEn: 'Translation & Escort',
    textZh: '父母不会中文，你们提供英文病历翻译和医院全程陪诊吗？',
    textEn: 'Do you provide English medical record translation and on-site hospital escort?',
  },
  {
    key: 'lead_info',
    labelZh: '测自动留资',
    labelEn: 'Lead Capture',
    textZh: '我在英国伦敦，想给父亲咨询膝关节置换陪诊服务，邮箱是 alex.chen@example.com。',
    textEn: 'I am in London, UK looking for knee replacement escort service. My email is alex.chen@example.com.',
  },
  {
    key: 'risk_diagnosis',
    labelZh: '⚠️ 问病情用药',
    labelEn: '⚠️ Ask Diagnosis',
    textZh: '肺部查出 8mm 磨玻璃结节是不是恶性肿瘤？现在该吃什么靶向药？',
    textEn: 'Is an 8mm ground-glass lung nodule malignant cancer? Which targeted drug should I take?',
  },
  {
    key: 'risk_pricing',
    labelZh: '⚠️ 问精确报价',
    labelEn: '⚠️ Exact Price',
    textZh: '心脏搭桥手术准确多少钱能包干？能保证百分之百治好吗？',
    textEn: 'What is the exact total cost for bypass surgery and can you guarantee a 100% cure?',
  },
];

const MEDICAL_RISK_RE =
  /(结节|肿瘤|癌症|恶性|良性|确诊|诊断|吃什么药|开药|用药|剂量|靶向|化疗|手术方案|能不能治|治愈|包治|百分之百|多少钱|报价|费用多少|准确价格|包干|malignant|cancer|diagnos|prescribe|medication|dosage|targeted therapy|exact cost|exact price|how much does surgery|guarantee cure|100%)/i;

const PRICING_RISK_RE = /(多少钱|报价|费用|价格|包干|exact cost|exact price|how much|quote)/i;

const REGION_LIST = [
  ['英国伦敦', /伦敦|london/i],
  ['英国', /英国|\bUK\b|united kingdom/i],
  ['美国纽约', /纽约|new york/i],
  ['美国', /美国|\bUSA\b|united states/i],
  ['新加坡', /新加坡|singapore/i],
  ['加拿大', /加拿大|canada|toronto|vancouver/i],
  ['澳大利亚', /澳洲|澳大利亚|australia|sydney|melbourne/i],
  ['欧洲', /德国|法国|欧洲|germany|france|europe/i],
];

const NEED_KEYWORDS = [
  ['膝关节/骨科陪诊', /膝关节|骨科|置换|knee|orthopedic/i],
  ['肿瘤多学科会诊', /结节|肿瘤|癌症|oncology|nodule|cancer/i],
  ['心脑血管专科', /心脏|搭桥|心血管|cardiac|bypass/i],
  ['来华预约与医疗签证', /预约|签证|visa|appointment/i],
  ['病历翻译与陪诊', /翻译|陪诊|translat|interpret|escort/i],
  ['体检与康复随访', /体检|康复|复诊|checkup|rehab/i],
];

function extractLeadFromText(text, prevLead) {
  const next = { ...prevLead };
  const updatedFields = [];

  for (const [label, regex] of REGION_LIST) {
    if (regex.test(text)) {
      if (next.region !== label) updatedFields.push('region');
      next.region = label;
      break;
    }
  }

  for (const [label, regex] of NEED_KEYWORDS) {
    if (regex.test(text)) {
      if (next.need !== label) updatedFields.push('need');
      next.need = label;
      break;
    }
  }

  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d[\d\s-]{7,15}\d)/);
  const wechatMatch = text.match(/(?:微信|WeChat|WhatsApp)[：:\s]*([A-Za-z0-9_-]{4,24})/i);

  const contactFound = emailMatch?.[0] || wechatMatch?.[1] || phoneMatch?.[0];
  if (contactFound) {
    if (next.contact !== contactFound) updatedFields.push('contact');
    next.contact = contactFound;
  }

  return { nextLead: next, updatedFields };
}

export function processMedicalTurn(rawText, prevLead, lang = 'zh') {
  const text = String(rawText || '').trim();
  const { nextLead, updatedFields } = extractLeadFromText(text, prevLead);

  // 1. 最高优先级：高风险医疗诊断 / 用药 / 精确报价护栏拦截
  if (MEDICAL_RISK_RE.test(text)) {
    const isPricing = PRICING_RISK_RE.test(text);
    nextLead.handoffStatus = 'human_priority';
    const guardrailReason = isPricing
      ? '触发报价与疗效承诺红线：医院具体费用需结合检查结果核定，严禁 AI 擅自报价或承诺疗效'
      : '触发临床医疗安全护栏：涉及病情良恶性判断、用药或手术方案，严禁 AI 输出医疗诊断建议';

    const reply =
      lang === 'en'
        ? isPricing
          ? 'Exact treatment pricing depends on clinical evaluation and hospital billing standards, and we never make outcome guarantees. I have flagged this inquiry for a human medical coordinator to provide an official estimate.'
          : 'I cannot provide medical diagnoses, malignancy assessments, or medication/treatment recommendations. Your case has been escalated to a human medical coordinator for professional review.'
        : isPricing
          ? '⚠️ 安全护栏已触发：具体诊疗费用需由医院结合病历与检查评估后核定，AI 助手不提供精确包干报价或疗效保证。我已将您的诉求标记为「人工顾问优先接管」。'
          : '⚠️ 安全护栏已触发：AI 助手仅提供就诊流程与服务信息，不提供病情良恶性判断、诊断结论或用药建议。已为您转交人工医疗顾问跟进核实。';

    return {
      route: 'human_handoff_guardrail',
      intentLabel: isPricing ? '高风险 · 精确报价 / 疗效承诺' : '高风险 · 临床诊疗 / 用药判断',
      guardrailTriggered: true,
      guardrailReason,
      matchedFaq: null,
      reply,
      lead: nextLead,
      updatedFields,
    };
  }

  // 2. 常规知识库 RAG 检索匹配
  let bestFaq = null;
  let bestScore = 0;
  for (const entry of medicalFaqEntries) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (text.toLowerCase().includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestFaq = entry;
    }
  }

  // 若同时提取了线索但没有明显匹配到特定 FAQ，也给 K-056 作为引导
  if (!bestFaq && updatedFields.length > 0) {
    bestFaq = medicalFaqEntries.find((e) => e.id === 'K-056');
    bestScore = 1;
  }

  if (bestFaq && bestScore > 0) {
    if (nextLead.handoffStatus === 'collecting' && nextLead.contact && nextLead.region) {
      nextLead.handoffStatus = 'lead_ready';
    }
    const baseAnswer = lang === 'en' ? bestFaq.answerEn : bestFaq.answerZh;
    const leadNote =
      updatedFields.length > 0
        ? lang === 'en'
          ? `\n\n[CRM Lead Synced] Captured: ${updatedFields.join(', ')}.`
          : `\n\n[线索卡片已同步更新] 已提取：${updatedFields.map((f) => (f === 'region' ? '所在地区' : f === 'need' ? '就医需求' : '联系方式')).join('、')}。`
        : '';

    return {
      route: 'rag_cited',
      intentLabel: `常规服务 · ${bestFaq.category}`,
      guardrailTriggered: false,
      guardrailReason: null,
      matchedFaq: bestFaq,
      reply: `${baseAnswer}${leadNote}`,
      lead: nextLead,
      updatedFields,
    };
  }

  // 3. 超出知识库范围，拒绝幻觉自由发挥，进入人工转接
  nextLead.handoffStatus = 'human_normal';
  return {
    route: 'out_of_kb_handoff',
    intentLabel: '知识库未命中 · 转人工核实',
    guardrailTriggered: false,
    guardrailReason: '约 170 条双语 FAQ 未命中直接依据，遵循“无依据不编造”原则转人工确认',
    matchedFaq: null,
    reply:
      lang === 'en'
        ? 'I do not have verified FAQ evidence for this specific question and will not guess. Please share your region and email/WhatsApp so a human coordinator can follow up.'
        : '当前双语知识库中暂无针对该问题的核验条目。为避免模型自由发挥产生误导，已为您记录并建议转交人工顾问核实；欢迎补充您的地区与联系方式。',
    lead: nextLead,
    updatedFields,
  };
}
