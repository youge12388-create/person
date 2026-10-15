# 案例素材替换

项目事实与正文在 `src/content.js`。配图、能力摘要、示例数据及逐步演示内容集中在 `src/caseDemos.js`，按项目 id 对应。

## 替换图片

把新图片放入 `public/image/cases/`，修改对应案例的 `image` 路径，也可以直接替换同名 WebP。建议 3:2 横图。更新 `imageAlt` 和 `imageNote`，描述展示内容。图片不叠加来源或生成方式角标；不能将配图中的示例数值作为项目成果。

目前三张配图由内置 imagegen 工具生成，再压缩为 WebP：

完整生成提示词见 [case-image-prompts.md](case-image-prompts.md)。

| 项目 id | 文件 | 生成提示词摘要 |
| --- | --- | --- |
| weekly-intelligence | weekly-intelligence.webp | 浅蓝背景、象牙白周报分析界面、工作事项和原文来源卡片，英文示例数据，无公司品牌 |
| university-agent | university-agent.webp | 鼠尾草绿背景、高校研究与筛选界面、虚构院校、官方来源卡片，不展示真实招生要求 |
| medical-concierge | medical-concierge.webp | 淡紫背景、双语服务对话、知识来源与人工交接，不包含患者信息与医疗建议 |

## 替换演示内容

- `capability`、`takeaway`、`evidence`：首页的能力定位、技术判断和项目依据。只填写可核验事实。
- `sample.source`、`sample.items`：高校与客服的来源原文和展示记录。默认均为虚构示例。周报的正常、缺失与冲突样例统一在 `src/weeklyDemo.js` 中维护。
- `steps`：与 `src/content.js` 中 `workflow` 的顺序和数量一致。`note` 解释处理逻辑，`output` 说明该节点的产物，`payload` 展示对应数据结构。
- `imageNote`：界面内容的简短描述，不作为图片角标。

交互只在本地切换展示，不请求 AI、不提交资料，也不创建业务记录。真实截图请使用可公开并脱敏的素材。

在线客服由用户主动开启，在 `chatbot-demo.html` 的独立 iframe 中运行。结束体验会卸载该 iframe；加载状态通过同源且校验消息来源窗口的 postMessage 传递。它使用已有外部客服服务，不属于本地示例数据处理。

`src/content.js` 的 `deliverables` 用于案例交付重点和打印简历；`repository` 是已核对主题的相关公开代码入口，不表示研究流程和仓库功能完全相同。项目上线状态、时间与效果指标未经确认时不添加。

## 查看

运行 `npm run dev`，在首页点击案例图片或“交互预览”；通过“阅读完整案例”进入对应详情。替换后运行 `npm run build`，并检查手机视图、图片说明与步骤内容。

参考方向：Linear 的产品场景呈现（https://linear.app/）、Stripe 的内容驱动交互（https://stripe.com/blog/globe）、Vercel Geist 的组件与状态规范（https://vercel.com/geist/introduction）。
