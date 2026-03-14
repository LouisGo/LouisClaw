# LouisClaw vNext skill 缺口与重构方案

> 目的：基于当前仓库与真实产品需求，判断现有 `skills/` 是否足够，并给出以契约为核心的重构方案。

## 1. 结论先行

当前 skill 体系不算错误，但明显不够。

主要问题不是“数量少”，而是：

- 现有 skill 更像命令操作手册
- 不够像能力边界与默认行为契约
- 没有把 `capture / triage / synthesis / publish / feedback` 这几类能力拆开

因此 vNext 应优先做的是：

- 重写现有 skill 的角色定义
- 补齐缺失的关键 skill
- 让 `OpenClaw` 通过 skill 像产品经理一样分派任务，而不是像 shell 助手一样只会跑命令

## 2. 当前 skill 评估

| skill | 当前定位 | 现状判断 | vNext 处理 |
|---|---|---|---|
| `ai-flow` | 总控入口 | 有用，但过于偏命令说明 | 保留，改成总路由与边界 skill |
| `ai-flow-intake` | 快速录入 | 有用，但默认行为不对 | 保留，改成静默录入优先 |
| `ai-flow-web-intake` | 网页/文章录入 | 有用，契约还不够完整 | 保留，强调正文摘要与持续来源策略 |
| `ai-flow-review` | 查看今日结果 | 有用，但范围太窄 | 保留，聚焦 review/debug，不承担 synthesis |
| `ai-flow-siyuan` | 导出到 SiYuan | 相对成熟 | 保留，补 publish 规则 |

当前缺失的 skill：

- `ai-flow-triage`
- `ai-flow-synthesis`
- `ai-flow-publish`
- `ai-flow-feedback`

## 3. 为什么现有 skill 还不够

### 3.1 缺少“默认静默录入”

你的真实场景里，大量输入只是“丢进去”，不要求立刻对话。

但当前 `ai-flow-intake` 仍然鼓励 capture 后追问是否继续跑流程，这和产品目标不一致。

### 3.2 缺少“小时级截流器”

当前 repo 有 `process_inbox`，但 skill 层没有把它定义成一个产品动作：

- 什么时候该跑
- 跑完应该产出什么
- 它和日报、专题整理的区别是什么

### 3.3 缺少“深度综合生成”

当前系统已经能做 daily digest，但用户真正开始要求的是：

- 回顾最近几天
- 只看 AI 相关
- 把散条目整理成一篇高质量文章

这类工作不应硬塞给 `review` 或 `siyuan` skill。

### 3.4 缺少“发布决策”

并不是所有产物都该直接发全文到 `IM`，也不是所有东西都要进 `SiYuan`。

需要单独的 publish 规则来约束：

- 写到哪里
- 通知到哪里
- 发送标题、短摘要还是全文

### 3.5 缺少“反馈闭环”

如果没有 feedback skill，系统会长期停留在一次性表现，而不是逐步贴合你的偏好。

## 4. vNext skill 架构

### 4.1 `ai-flow`

角色：总路由与边界 skill。

负责：

- 识别用户是要录入、整理、回顾、发布还是调试
- 把请求转给更专门的 skill
- 强调 repo / `OpenClaw` / `SiYuan` / `IM` 的边界

不负责：

- 长期代替专门 skill 完成所有具体工作

### 4.2 `ai-flow-intake`

角色：静默录入。

负责：

- 快速把文本、链接、片段、想法送进 repo
- 默认只做 capture，不扩展成长对话

默认行为：

- 成功落盘后简短确认
- 没有明确要求时，不自动跑全流程

### 4.3 `ai-flow-web-intake`

角色：网页/文章/持续来源录入。

负责：

- 一次性网页 capture
- 带简短 why-it-matters 的录入
- 指导可持续来源使用 markdown pull

默认行为：

- 不保存原始 HTML 到主流程
- 保留干净摘要、摘录、链接

### 4.4 `ai-flow-triage`

角色：小时级轻整理。

负责：

- 跑最近时间窗内容的轻处理
- 输出这一小时的主题、候选 digest、候选 follow-up、重复与噪音

默认行为：

- 优先低成本
- 不生成长文
- 不默认写 `SiYuan` 长篇产物

### 4.5 `ai-flow-review`

角色：查看与排错。

负责：

- 看今天处理了什么
- 检查 digest 是否可用
- 检查分类/导出是否异常

不负责：

- 代替专题综合写作

### 4.6 `ai-flow-synthesis`

角色：深度综合生成。

负责：

- 按主题、时间段、项目、标签生成高质量文章
- 从 repo 现有结构化数据出发生成高价值内容

适用场景：

- “整理最近几天的 AI 输入”
- “把某项目相关条目写成一篇说明文”
- “不要日报，给我一个阶段总结”

默认行为：

- 优先把长文写入 `SiYuan`
- `IM` 只做标题级通知

### 4.7 `ai-flow-publish`

角色：发布与通知。

负责：

- 决定产物应该去 `SiYuan`、`IM` 或本地导出目录
- 明确标题、路径、通知粒度、是否需要更新旧文档

默认行为：

- 长文优先 `SiYuan`
- `IM` 默认只发标题或短提醒

### 4.8 `ai-flow-siyuan`

角色：`SiYuan` publish adapter。

负责：

- 按官方 API 把 digest、follow-up、专题文导出到可见文档
- 验证路径、映射、更新语义

不负责：

- 决定内容本身该不该发布

### 4.9 `ai-flow-feedback`

角色：最小反馈闭环。

负责：

- 记录“有用/没用/多来/少来”
- 将反馈写回结构化元数据或反馈记录

默认行为：

- 只做最小闭环，不做复杂偏好学习承诺

## 5. 建议的 skill 输入/输出契约

| skill | 典型输入 | 典型输出 | 默认成本 |
|---|---|---|---|
| `ai-flow-intake` | 文本、链接、片段 | landing/inbox record | 低 |
| `ai-flow-web-intake` | URL + 摘录/总结 | landing record | 低 |
| `ai-flow-triage` | 时间窗或未处理 items | triage summary + updated items | 低到中 |
| `ai-flow-review` | 日期、状态问题 | review summary | 低 |
| `ai-flow-synthesis` | 主题、时间段、标签、项目 | 高质量 Markdown 文稿 | 中到高 |
| `ai-flow-publish` | 已生成产物 | `SiYuan` doc / IM notice | 低到中 |
| `ai-flow-feedback` | 简短反馈指令 | feedback record | 低 |

## 6. 落地优先级

### P0：立刻该做

- 重写 `ai-flow` 为总路由 skill
- 重写 `ai-flow-intake` 为静默录入优先
- 明确 `ai-flow-review` 不负责 synthesis
- 在文档中写清 `publish` 与 `synthesis` 的职责区别

### P1：优先新增

- 新增 `ai-flow-triage`
- 新增 `ai-flow-synthesis`
- 新增 `ai-flow-publish`

### P2：随后补齐

- 新增 `ai-flow-feedback`
- 如果需要，再补极少量 repo 接口来承接反馈记录或专题文产物索引

## 7. 对代码仓库的约束

skill 增强不意味着仓库可以无边界扩张。

应继续坚持：

- repo 只暴露稳定原语和契约
- 除非 skill 落不住地，否则先不为高语义任务补复杂代码
- 只有当某能力被重复使用且需要稳定复放时，才考虑沉到代码层

## 8. 近期可执行动作

最小且高价值的动作顺序：

1. 修正现有 `ai-flow` 与 `ai-flow-intake`
2. 新增 `ai-flow-triage`、`ai-flow-synthesis`、`ai-flow-publish`
3. 让 `README` 和工作流文档把这些 skill 公开出来
4. 观察真实使用 1~2 周，再决定是否需要补代码接口

## 9. 一句话结论

当前最缺的不是更多底层代码，而是：

> 一套能把 `OpenClaw` 约束成“按产品分工工作”的 skill 契约体系。
