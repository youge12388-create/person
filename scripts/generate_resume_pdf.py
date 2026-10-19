from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "游丰奕_AI应用开发_FDE_简历.pdf"

FONT_DIR = Path(r"C:\Windows\Fonts")
pdfmetrics.registerFont(TTFont("DengXian", str(FONT_DIR / "Deng.ttf")))
pdfmetrics.registerFont(TTFont("DengXianBold", str(FONT_DIR / "Dengb.ttf")))
pdfmetrics.registerFontFamily(
    "DengXian",
    normal="DengXian",
    bold="DengXianBold",
    italic="DengXian",
    boldItalic="DengXianBold",
)

NAVY = colors.HexColor("#17324D")
BLUE = colors.HexColor("#315E88")
PALE = colors.HexColor("#E8EFF3")
INK = colors.HexColor("#17232D")
BODY = colors.HexColor("#33434F")
MUTED = colors.HexColor("#667783")
RULE = colors.HexColor("#C9D5DC")
WHITE = colors.HexColor("#FFFFFF")

CONTACT = (
    "17376526436 <font color='#9DB3C1'>|</font> "
    "you123886@163.com <font color='#9DB3C1'>|</font> "
    "<link href='https://github.com/youge12388-create' color='#D8E5ED'>"
    "github.com/youge12388-create</link>"
)


def style(name, **kwargs):
    base = {
        "fontName": "DengXian",
        "fontSize": 9.2,
        "leading": 14.2,
        "textColor": BODY,
        "wordWrap": "CJK",
    }
    base.update(kwargs)
    return ParagraphStyle(name, **base)


NAME = style("Name", fontName="DengXianBold", fontSize=27, leading=31, textColor=WHITE)
ROLE = style(
    "Role",
    fontName="DengXianBold",
    fontSize=10.5,
    leading=15,
    textColor=colors.HexColor("#D9E6EE"),
    alignment=TA_RIGHT,
)
CONTACT_STYLE = style(
    "Contact",
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor("#D9E6EE"),
)
SECTION = style(
    "Section",
    fontName="DengXianBold",
    fontSize=10.8,
    leading=15,
    textColor=WHITE,
)
SECTION_EN = style(
    "SectionEn",
    fontSize=8.1,
    leading=12,
    textColor=MUTED,
)
PROFILE = style("Profile", fontSize=8.9, leading=13.3, textColor=BODY)
SKILL_LABEL = style(
    "SkillLabel",
    fontName="DengXianBold",
    fontSize=8.2,
    leading=12,
    textColor=NAVY,
)
SKILL_VALUE = style("SkillValue", fontSize=8.2, leading=12, textColor=BODY)
ROLE_TITLE = style(
    "RoleTitle",
    fontName="DengXianBold",
    fontSize=9.7,
    leading=13,
    textColor=INK,
)
PERIOD = style(
    "Period",
    fontSize=8.2,
    leading=12,
    textColor=MUTED,
    alignment=TA_RIGHT,
)
COMPANY = style(
    "Company",
    fontName="DengXianBold",
    fontSize=8.5,
    leading=11.5,
    textColor=BLUE,
)
BODY_TEXT = style("Body", fontSize=8.7, leading=13.1)
BULLET = style(
    "Bullet",
    fontSize=8.5,
    leading=12.4,
    leftIndent=11,
    bulletIndent=0,
    bulletFontName="DengXianBold",
    bulletFontSize=8.5,
    bulletColor=BLUE,
)
PROJECT_TITLE = style(
    "ProjectTitle",
    fontName="DengXianBold",
    fontSize=10.5,
    leading=14,
    textColor=NAVY,
)
STACK = style(
    "Stack",
    fontSize=7.8,
    leading=11,
    textColor=MUTED,
    alignment=TA_RIGHT,
)


def section_heading(cn, en):
    table = Table(
        [
            [
                Paragraph(cn, SECTION),
                Paragraph(en.upper(), SECTION_EN),
            ]
        ],
        colWidths=[80, 443],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BACKGROUND", (0, 0), (0, 0), NAVY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 13),
                ("RIGHTPADDING", (0, 0), (0, 0), 8),
                ("LEFTPADDING", (1, 0), (1, 0), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -1), 0.45, RULE),
            ]
        )
    )
    return [Spacer(1, 4), table, Spacer(1, 2.5)]


def project_heading(title, stack):
    table = Table(
        [
            [
                Paragraph(title, PROJECT_TITLE),
                Paragraph(stack, STACK),
            ]
        ],
        colWidths=[340, 183],
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def experience_block(role, company, period, bullets):
    top = Table(
        [
            [
                Paragraph(role, ROLE_TITLE),
                Paragraph(period, PERIOD),
            ]
        ],
        colWidths=[430, 93],
    )
    top.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    items = [
        top,
        Paragraph(company, COMPANY),
        Spacer(1, 2.5),
    ]
    items.extend(Paragraph(text, BULLET, bulletText="•") for text in bullets)
    items.append(Spacer(1, 5))
    return KeepTogether(items)


def project_block(title, stack, summary, bullets):
    items = [
        project_heading(title, stack),
        Spacer(1, 2),
        Paragraph(summary, BODY_TEXT),
        Spacer(1, 2),
    ]
    items.extend(Paragraph(text, BULLET, bulletText="•") for text in bullets)
    items.append(Spacer(1, 5))
    return KeepTogether(items)


def draw_footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(colors.HexColor("#DCE4E9"))
    canvas.setLineWidth(0.5)
    canvas.line(36, 24, width - 36, 24)
    canvas.setFont("DengXian", 7.4)
    canvas.setFillColor(MUTED)
    canvas.drawString(36, 12, "游丰奕 · FDE 工程师 / AI 应用交付")
    canvas.restoreState()


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=30,
        bottomMargin=30,
        title="游丰奕 - FDE 工程师 / AI 应用交付",
        author="游丰奕",
        subject="个人简历",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        id="resume",
    )
    doc.addPageTemplates([PageTemplate(id="resume", frames=[frame], onPage=draw_footer)])

    header = Table(
        [
            [
                Paragraph("游丰奕", NAME),
                Paragraph("FDE 工程师 / AI 应用交付", ROLE),
            ],
            [
                Paragraph(CONTACT, CONTACT_STYLE),
                "",
            ],
        ],
        colWidths=[312, 211],
    )
    header.setStyle(
        TableStyle(
            [
                ("SPAN", (0, 1), (1, 1)),
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (-1, 0), 17),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
                ("TOPPADDING", (0, 1), (-1, 1), 3),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 15),
            ]
        )
    )

    story = [
        header,
        Spacer(1, 8),
        Paragraph(
            "偏工程型的 AI 应用交付者。能从业务现场拆问题，也能把数据、模型、规则和系统接到一条线上；"
            "擅长把模糊、依赖人工的流程重构成可运行、可追溯、可验收的 AI 工作流。",
            PROFILE,
        ),
    ]

    story.extend(section_heading("专业技能", "Professional Skills"))
    skill_rows = [
        [
            Paragraph("AI 交付", SKILL_LABEL),
            Paragraph(
                "Agent / Skill 设计 · RAG / 知识库 · Structured Output · Prompt Engineering · "
                "Workflow 编排 · 规则约束与评测",
                SKILL_VALUE,
            ),
        ],
        [
            Paragraph("工程与数据", SKILL_LABEL),
            Paragraph(
                "Python · FastAPI · Node.js · React · Next.js · TypeScript · "
                "PostgreSQL · MySQL · Redis",
                SKILL_VALUE,
            ),
        ],
        [
            Paragraph("部署与协作", SKILL_LABEL),
            Paragraph(
                "Docker · Nginx · Linux · Git · 接口联调 · 日志排查；"
                "使用 Codex、Claude Code、Cursor 辅助开发、审查与测试",
                SKILL_VALUE,
            ),
        ],
    ]
    skill_table = Table(skill_rows, colWidths=[86, 437])
    skill_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), 10),
                ("LEFTPADDING", (1, 0), (1, -1), 0),
                ("RIGHTPADDING", (1, 0), (1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#E4EAEE")),
            ]
        )
    )
    story.append(skill_table)

    story.extend(section_heading("工作经历", "Work Experience"))
    story.append(
        experience_block(
            "FDE 工程师",
            "华太西就教育科技有限公司",
            "2026.02 - 2026.10",
            [
                "<b>端到端交付：</b>主导企业 AI 应用从需求调研、方案设计，到 Skill / Agent、"
                "Web 开发、测试和部署，推进周报分析、高校招生数据自动化与国际学生选校等项目。",
                "<b>业务流程重构：</b>面向约 40 人组织，将人工 SOP 重构为"
                "“采集 → 校验 → LLM → Web 应用”闭环，推动管理方式从逐份阅读转向结构化分析、"
                "异常发现与证据追溯。",
                "<b>工程边界：</b>把来源追溯、失败重试、异常回退和人工复核写进系统，"
                "让模型结果可核验、可交付，并预留 OA、审批与文档接入空间。",
            ],
        )
    )
    story.append(
        experience_block(
            "AI 产品专员",
            "锦囊妙计企业管理有限公司",
            "2025.02 - 2025.10",
            [
                "<b>AI 工具体系：</b>沉淀教程、Prompt 模板、业务 SOP 与培训材料；"
                "基于 OpenClaw、Codex、扣子配置客服、获客与内容生产助手，"
                "打通知识库、Prompt 与业务流程。",
            ],
        )
    )

    story.extend(section_heading("项目经历", "Project Experience"))
    story.append(
        project_block(
            "01  企业微信周报智能分析平台",
            "React · FastAPI · PostgreSQL · Docker",
            "面向约 40 人的业务组织，0→1 设计并开发企业微信周报智能分析平台，"
            "独立负责需求、架构与核心开发，把人工阅读升级为可下钻、可追溯的管理视图。",
            [
                "<b>数据链路与建模：</b>打通企业微信组织与周报同步，设计员工、部门、原始周报、"
                "工作事项 4 类核心模型；支持全量 / 增量同步、失败重试与日志追踪，"
                "并用分层结构隔离接入、原文、处理与业务数据。",
                "<b>LLM 结构化解析：</b>利用 Structured Output 从周报中抽取工作事项、分类、"
                "状态、计划、置信度等字段；约束原文不可覆盖、无依据不得补充、无法判断进入待确认。",
                "<b>分析与证据追溯：</b>支持公司 → 部门 → 员工 → 原始周报下钻，"
                "让重复工作、长期未完成事项及潜在卡点可定位、可回查；问答结果关联人员、"
                "事项、周报与时间周期。",
            ],
        )
    )
    story.append(
        project_block(
            "02  高校数据智能化与国际学生选校 Skill",
            "WorkBuddy · Structured Output · Excel",
            "面向约 196 所高校的目标场景，把院校调研与选校从人工经验沉淀为可复用 Skill 和可核验的数据链路，"
            "并基于 WorkBuddy 等国内 Agent 平台执行。",
            [
                "<b>Research Skill：</b>将找学校、查官网、定位简章、核对年份、提取字段、"
                "填写 Excel 六步流程封装为可复用 Skill，执行官方来源、目标年份与最新版本优先策略；"
                "提取专业、学费、语言、GPA、申请材料、截止日期、奖学金等 8+ 核心字段。",
                "<b>选校 Skill：</b>依据国籍、学历、专业背景、GPA、IELTS / HSK、预算及入学年份"
                "等条件，采用“硬规则过滤 + LLM 语义判断”两阶段匹配。",
                "<b>结果可核验：</b>保留来源链接、数据年份与 Fresh / Needs Recheck / Unverified "
                "状态，并用随机学生样本做端到端回归，覆盖语言、预算、年份、奖学金与重复院校等情况。",
            ],
        )
    )
    story.append(
        project_block(
            "03  跨境医疗双语 AI 客服",
            "Dify · RAG · Prompt Engineering",
            "面向欧美国际患者来华就医咨询，搭建从知识问答、需求收集到顾问接手的双语 AI 服务链路。",
            [
                "<b>服务链路与知识库：</b>设计“意图识别 → RAG 检索 → 受约束回答 → 留资 / 转人工”"
                "流程，建设约 170 条双语 FAQ，覆盖医院匹配、费用、预约、签证等 9 类核心场景。",
                "<b>安全边界与业务分流：</b>基于 Dify + RAG 限定知识来源，医院推荐、医疗判断与"
                "具体费用进入人工确认；结构化收集国家 / 地区、医疗需求与联系方式，为顾问提供可跟进线索。",
            ],
        )
    )

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
