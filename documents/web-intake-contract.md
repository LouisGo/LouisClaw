# Web Intake 契约备忘

这份备忘只定义 **LouisClaw 当前可接受的 web intake 边界**，不引入新的持久化逻辑。

## 目标

把“从互联网上抓到的内容”继续收敛到现有本地流水线里，而不是在 OpenClaw skill 里偷偷长出一套新的存储系统。

当前主线仍然是：

`web/chat/orchestration -> data/landing -> data/inbox -> process -> digest/export`

## 基本原则

1. **repo 是 source of truth**
   - 持久化契约属于仓库里的命令、目录和 schema。
   - skill 负责抓取、编排、引导，不负责发明新的 durable storage。

2. **优先复用现有命令**
   - 一次性 URL / 页面记录：`npm run web-intake -- ...`
   - 可重复拉取的 markdown 源：`MARKDOWN_PULL_SOURCES`
   - 下游处理：`npm run task -- run process_inbox` 或 `npm run run`

3. **保持 local-first**
   - 不把 web intake 的主状态藏在 machine-local OpenClaw 配置里。
   - 不直接把内容写进现有 SiYuan 笔记本目录。

## 什么时候用哪条路径

### 路径 A：快速一次性保存网页 / 文章 / 链接

适用场景：

- 只是想把一个链接、网页结论、短摘录收进流水线
- 这次记录不需要长期自动重复抓取

推荐做法：

```bash
npm run web-intake -- --url "https://..." --title "页面标题" --content "一句话摘要或摘录"
```

约束：

- `--content` 放清洗后的摘要、摘录或“为什么值得留”
- 不要把整页原始 HTML 直接塞进去

### 路径 B：网页来源 + 简短备注

适用场景：

- 想同时保存 URL 和自己的判断
- 需要后续分类、digest、follow-up，但不需要定时抓取

推荐做法仍然是 `npm run web-intake -- ...`，只是把备注写进 `--content`。

### 路径 C：可重复、可扩展的长期来源

适用场景：

- 这是一个你会反复观察的来源
- 希望之后继续通过 pull 机制增量进入流水线

推荐做法：

1. 把抓取结果整理到一个**稳定的本地 append-only markdown 文件**
2. 把它纳入 `MARKDOWN_PULL_SOURCES`
3. 使用：

```bash
npm run task -- run pull_markdown_sources
npm run task -- run process_inbox
```

或者直接：

```bash
npm run run
```

为什么这样更合适：

- 现在 repo 已经有 append-only markdown pull 的最小契约
- 这样可以保留 state、去重、可观测性和后续 cron 复用空间

## Skill 与 repo 的边界

### Skill 应该做什么

- 根据用户需求抓网页、读网页、做轻量整理
- 判断这是一次性 intake 还是可重复来源
- 把用户引导到已有命令

### Skill 不应该做什么

- 在 skill 里自建一套 durable persistence 规则
- 绕过 repo 直接把内容写到别处
- 把长期状态只保存在 `~/.openclaw/` 之类机器本地位置

## 当前建议的最小落地策略

1. 一次性 web intake：走 `npm run web-intake -- ...`
2. 长期来源：整理到本地 markdown，同步进入 `MARKDOWN_PULL_SOURCES`
3. 后续如果真的要做更正式的“web source pull”，也应当在 repo 里补命令/契约，而不是只扩 skill

## 和 SiYuan 的关系

- Web intake 的主线仍然是 LouisClaw 本地流水线
- SiYuan 仍然只是增量导出目标或未来可选读取表面
- 不要把 web intake 直接写入现有 SiYuan 笔记本作为主存储
