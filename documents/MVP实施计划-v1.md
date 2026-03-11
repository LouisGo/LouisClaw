# AI 个人信息流工作流 · MVP 实施计划 v1

> 目标：在不接入任何 IM Bot、不改动思源既有目录结构的前提下，先在本机跑通“输入 → 队列 → 初筛 → 日报 → 本地验证”的完整闭环。

---

## 1. 本轮确认后的硬约束

- 不把 `Telegram`、微信或其他 `IM Bot` 作为 MVP 前置条件。
- 先在本机完成闭环，输出先用本地文件和调试日志验证。
- 所有对 `思源笔记` 的集成都必须是增量式的，不能影响既有笔记本、目录和文件。
- 推送消息需要支持“摘要消息 + 原文 `.md` 附件”模式，便于在 IM 中快速看简介、按需下载原文。
- 推送产生的附件上传与下载不能走 `思源笔记`，避免浪费云存储空间。
- 架构上必须保持输入层和输出层可插拔，后续可以随时接入任意 `IM Bot`。
- 存储优先采用文件化方案。
- 首批支持输入类型：文本、链接、代码片段、图片、视频链接。

---

## 2. MVP 最终目标

MVP 只验证一件事：

> 你是否能持续把碎片信息投入系统，并稳定得到一份明显优于原始输入流的日报。

本期必须跑通：

```text
本地统一入口
→ 原始队列落盘
→ 规则预处理
→ AI 轻量初筛
→ 结构化 Item 存储
→ 日报 Markdown 生成
→ 本地输出验证（文件 / 日志）
```

---

## 3. 思源笔记的集成原则

### 3.1 集成定位

思源在 MVP 中不承担“唯一入口”，而是承担两个更稳妥的角色：

1. **增量归档目标**：将处理后的高价值内容以独立目录写入思源。
2. **可选输入来源**：后续在不破坏现有结构的前提下，从指定增量目录中读取内容。

### 3.2 明确边界

MVP 阶段：

- 不扫描你的全部思源库。
- 不重组你已有的笔记树。
- 不修改你既有笔记内容。
- 不依赖思源内部数据库做首版主流程。
- 不将推送附件、原文下载文件、临时导出文件存入思源目录。

这样做的原因：

- 风险最低，不会污染现有知识体系。
- 可以先验证信息流本身是否值得长期使用。
- 后续即便替换思源或增加 IM 入口，也不用推翻主架构。

---

## 4. 思源增量目录规则

### 4.1 原则

- 所有新增内容都写入一个专用增量根目录。
- 该目录必须与你现有笔记内容隔离。
- 系统只对这个目录拥有写权限。
- 系统生成的文件命名必须稳定、可追踪、可重放。

### 4.2 推荐目录结构

建议在思源中单独建立一个顶层笔记本或顶层目录，例如：

```text
AI-Flow/
  inbox/
  digests/
  archive/
  follow-ups/
  meta/
```

如果你不希望新建顶层笔记本，则至少保证存在一个独立目录，例如：

```text
你的某个既有笔记本/
  AI-Flow/
    inbox/
    digests/
    archive/
    follow-ups/
    meta/
```

### 4.3 目录职责

- `inbox/`：仅存手工导入或待处理的原始条目镜像，可选。
- `digests/`：日报、周报等聚合输出。
- `archive/`：被判定为 `archive` 或 `digest` 的结构化归档条目。
- `follow-ups/`：需要行动或重点跟进的条目。
- `meta/`：系统状态、映射表、游标、索引等元数据。

说明：

- 以上目录仅用于思源内的增量知识归档。
- `IM` 推送附件、原文导出文件、临时发送文件必须存放在项目自己的工作目录，不写入思源。

### 4.4 文件命名规则

建议使用“时间 + 稳定 id + 简短 slug”组合：

```text
2026-03-11-9f3a2c-interesting-video-link.md
2026-03-11-daily-digest.md
2026-W11-weekly-digest.md
```

要求：

- 文件名不依赖思源已有标题体系。
- 即使标题变化，主键仍可追踪。
- 同一条目重复写入时应能识别并跳过或更新。

### 4.5 写入规则

- 仅新增到 `AI-Flow/` 作用域内。
- 默认只追加新文件，不直接覆盖既有人工笔记。
- 如需更新，必须只更新系统自己创建过且有元数据标记的文件。
- 每次写入都记录 `source_item_id` 与 `created_by=ai-flow`。

### 4.6 元数据规则

每个系统生成的 Markdown 文件头部建议保留统一元数据：

```yaml
id: item_20260311_9f3a2c
created_by: ai-flow
source_item_id: item_20260311_9f3a2c
decision: digest
topic: ai-tools
capture_time: 2026-03-11T10:30:00+08:00
```

这保证后续增量同步时可以：

- 知道文件是否由系统创建。
- 知道是否允许更新。
- 知道与本地结构化条目的映射关系。

---

## 5. MVP 技术架构

### 5.1 分层

```text
[Input Adapters]
  CLI / watch folder / future IM bot / future SiYuan import
        ↓
[Inbox]
  原始输入落盘
        ↓
[Preprocess]
  去重 / 标准化 / 类型识别 / 基础过滤
        ↓
[AI Classifier]
  summary / tags / topic / decision / reason / score
        ↓
[Storage]
  raw / items / digests / exports / logs / state
        ↓
[Output Adapters]
  local digest preview / debug log / future IM bot / SiYuan export
```

### 5.2 MVP 目录建议

项目内先建立：

```text
config/
data/
  inbox/
  raw/
  items/
  digests/
  exports/
  state/
  logs/
prompts/
src/
```

职责：

- `data/inbox/`：统一入口的投递落点。
- `data/raw/`：原始记录。
- `data/items/`：结构化 Item。
- `data/digests/`：日报文件。
- `data/exports/`：用于 IM 发送的 `.md` 原文、摘要附件、临时导出文件。
- `data/state/`：游标、去重索引、思源映射。
- `data/logs/`：调试与运行日志。

### 5.3 输出与附件分层

为避免思源云空间浪费，输出层分为两类：

1. **知识归档输出**：写入思源增量目录
2. **消息投递输出**：写入 `data/exports/`，供 IM Bot 上传附件

规则：

- 归档文件可进入思源
- 推送附件不得进入思源
- 同一内容可以同时存在“思源归档版”和“IM 发送版”，但物理存储分离

---

## 6. MVP 统一入口方案

### 6.1 推荐入口组合

先做两种本地入口，够用且可扩展：

1. `watch inbox 目录`
2. `CLI add 命令`

这样兼顾：

- Mac 本地快速投递
- 后续接 Android 同步、自动化脚本或 IM Bot 时无需重构核心流程

### 6.2 入口定义

#### A. watch inbox 目录

系统监听 `data/inbox/`。

允许投递格式：

- `.md`
- `.txt`
- `.json`

每个输入文件至少包含：

- `source`
- `device`
- `capture_time`
- `content_type`
- `raw_content`
- `url`（可空）

#### B. CLI add

示例：

```bash
ai-flow add --type text --source mac --device macbook --content "..."
ai-flow add --type link --source manual --url "https://..."
ai-flow add --type code --source mac --file snippet.js
```

CLI 负责把输入统一转成 `data/inbox/` 下的标准文件。

---

## 7. 标准 Item 结构

MVP 建议固定为：

```yaml
id:
source:
device:
capture_time:
content_type:
raw_content:
normalized_content:
url:
title:
tags: []
topic:
status:
value_score:
decision:
reason:
summary:
dedupe_key:
siYuan_sync:
  exported: false
  path:
  updated_at:
```

补充说明：

- `status`：`pending | processed | exported | summarized | dropped`
- `siYuan_sync`：用于记录是否已写入思源增量目录

---

## 8. 预处理规则

### 8.1 去重

- 相同 `url` 直接判重。
- 无 `url` 时，对 `normalized_content` 计算 hash。
- 重复条目保留主条目，重复记录写入引用关系。

### 8.2 基础过滤

- 纯表情、纯语气词、无语义短句：`drop`
- 极短文本但带链接：保留
- 视频链接：只抽取标题、简介、链接元信息
- 图片：优先保留文件路径与附带说明，不默认做重 OCR

### 8.3 截断

- 超长文本先做规范化和截断，再送入轻量 AI
- 原文仍保存在 `raw` 层，不丢失

---

## 9. AI 轻处理定义

### 9.1 输入

- 单条 `Item` 为主
- 初版不做大批量，降低调试复杂度

### 9.2 输出

- `decision`
- `value_score`
- `tags`
- `topic`
- `summary`
- `reason`

### 9.3 决策标准

- `drop`：噪音或明显不值得回看
- `archive`：保留，但不进日报
- `digest`：进入日报
- `follow_up`：需要行动或重点关注

---

## 10. 日报与本地输出验证

### 10.1 日报模板

```text
# Daily Digest - 2026-03-11

## 今日重点

## 分类摘要

## 需要行动

## 归档参考
```

### 10.2 本地验证方式

- 在 `data/digests/` 生成日报 Markdown
- 在 `data/exports/` 生成适合外发的 `.md` 原文或日报附件
- 在 `data/logs/` 记录本次处理摘要
- 在终端提供一份简化预览

这一步替代早期 IM 推送，先验证内容质量。

### 10.3 后续 IM 推送优化策略

推送适配器上线后，默认采用二层交付：

1. 一条短消息：只放简介、重点、为什么值得看
2. 一个 `.md` 附件：放完整日报或原文整理版

建议策略：

- 短内容：直接发纯文本
- 中长内容：发“简介 + `.md` 附件”
- `follow_up`：正文摘要放消息体，详细材料放附件

这样可以兼顾：

- IM 中快速浏览
- 需要时下载原文阅读
- 避免长消息污染聊天窗口

### 10.4 附件文件规则

建议统一放在：

```text
data/exports/digests/
data/exports/items/
data/exports/follow-ups/
```

命名规则建议：

```text
2026-03-11-daily-digest.md
2026-03-11-item-9f3a2c.md
2026-03-11-follow-up-9f3a2c.md
```

要求：

- 文件可重复生成
- 文件可独立上传到任意 IM
- 文件删除不影响思源归档
- 文件生命周期单独管理，不与思源同步策略绑定

---

## 11. 思源集成分期

### Phase A：只定义接口，不接入

- 在代码中抽象 `output adapter`
- 先实现 `local output adapter`
- 预留 `siYuan exporter adapter`
- 预留 `im delivery adapter`

### Phase B：增量写入思源

- 只将 `digest`、`follow_up`、部分 `archive` 输出到思源增量目录
- 不从思源反向读取
- 不处理 IM 附件存储

### Phase C：思源作为可选输入源

- 仅扫描 `AI-Flow/inbox/` 或约定目录
- 通过游标记录增量读取位置
- 不遍历现有全库

### Phase D：IM 消息与附件投递

- 读取 `data/exports/` 中的可发送文件
- 发送“摘要消息 + `.md` 附件`
- 记录发送状态、附件路径、外发时间
- 附件过期或清理由项目自身策略负责，不交给思源

---

## 12. 可直接开工的开发顺序

### P0-1 基础骨架

- 建立项目目录结构
- 建立配置文件格式
- 定义 `Item` schema
- 定义状态流转与 dedupe 规则

交付物：

- `config/example.*`
- `src/types`
- `src/config`
- `data/` 空目录骨架

### P0-2 本地统一入口

- 实现 `watch inbox`
- 实现 `CLI add`
- 将输入转成原始记录 + `Item`

交付物：

- `src/adapters/input`
- `src/commands/add`
- `src/pipeline/intake`

### P0-3 预处理

- 标准化文本
- 生成 `dedupe_key`
- 实现基础过滤
- 实现重复检测

交付物：

- `src/pipeline/preprocess`
- `src/services/dedupe`

### P0-4 AI 轻处理

- 定义 prompt 模板
- 接入模型调用封装
- 保存结构化判断结果

交付物：

- `prompts/classify-item.md`
- `src/services/ai`
- `src/pipeline/classify`

### P0-5 日报生成

- 拉取当日 `digest` / `follow_up`
- 生成日报 Markdown
- 保存日报文件、外发附件与预览日志

交付物：

- `src/pipeline/digest`
- `src/templates/daily-digest`

### P0-6 外发附件导出

- 从日报或条目生成 `.md` 外发文件
- 保存到 `data/exports/`
- 记录导出映射与生命周期

交付物：

- `src/pipeline/export`
- `src/adapters/output/export-files`

### P1-1 思源增量导出

- 定义思源导出配置
- 写入 `AI-Flow/digests/`
- 写入 `AI-Flow/archive/`
- 保存映射关系
- 明确与 `data/exports/` 完全隔离

交付物：

- `src/adapters/output/siyuan`
- `data/state/siyuan-map.*`

---

## 13. 开工前必须确认的最小配置

这些一旦确定，就可以直接开始编码：

### 13.1 本地技术栈

建议优先：

- `Node.js + TypeScript`
- 原因：CLI、文件监听、JSON/Markdown 处理、后续接 Bot 都顺手

### 13.2 配置项

至少需要：

```text
AI_MODEL=
AI_API_KEY=
WORKSPACE_ROOT=
SIYUAN_EXPORT_ROOT=
ENABLE_SIYUAN_EXPORT=false
EXPORT_ROOT=
ENABLE_IM_ATTACHMENT_EXPORT=true
```

### 13.3 思源导出根目录

最终只允许配置一个明确根路径，例如：

```text
/path/to/siyuan/notebook/AI-Flow
```

系统对这个目录外的内容不做任何写操作。

---

## 14. 当前版本的推荐决策

为了最快进入开发，我建议现在默认采用：

- 技术栈：`Node.js + TypeScript`
- 入口：`watch inbox + CLI add`
- 输出：`本地 digest 文件 + 调试日志 + 独立 .md 外发附件`
- 思源策略：`先定义导出接口，第二阶段接增量导出`
- IM 策略：`消息摘要与附件分离，附件只走项目工作目录`
- 思源目录：独立 `AI-Flow/` 根目录

---

## 16. 关于 SKILL 的落地说明

当前仓库环境里没有可直接加载的现成 `skill` 可用，因此这一能力先通过架构约束实现，而不是依赖外部 Skill 包：

- 在 `output adapter` 中显式拆分 `siyuan export` 与 `im attachment export`
- 在配置层加入独立导出根目录与生命周期策略
- 在数据层加入 `exports` 目录，作为未来 IM Bot 的标准附件来源

后续如果环境支持自定义 Skill，再把这部分抽象成独立 Skill：

- `siyuan-incremental-export`
- `im-attachment-delivery`

---

## 15. 开始开发前的完成定义

达到以下状态，就说明已经“可以立即开工”：

- 已明确不以 IM Bot 为前提
- 已明确思源只走增量目录，不碰现有笔记结构
- 已明确本地入口、存储、处理、输出的分层
- 已明确项目目录、Item 结构、状态流转和输出目标
- 已明确先做哪些模块、每一步产出什么

一句话说，现在距离开始写代码，已经只差把项目骨架搭起来了。
