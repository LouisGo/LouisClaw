# LouisClaw Synthesis Output Contract

> 目的：为 `ai-flow-synthesis` 与 `ai-flow-publish` 提供稳定的中间产物约定，避免“能生成文章，但不知道文章该放哪、怎么发布、如何被后续步骤发现”。

## 1. 当前定位

`synthesis` 产物不是新的主状态来源。

它是基于现有 `items` / `digests` 生成的高价值 Markdown 文稿，默认用于：

- 主题文章
- 阶段回顾
- 项目总结
- 方法卡 / 判断卡

repo 仍然是 source of truth；`synthesis` 产物是上层文稿资产。

## 2. 最小产物类型

当前先约定 3 类：

- `topic_article`
- `period_recap`
- `project_note`

后续如果需要，再扩展更细分类。

## 3. 当前推荐落盘位置

在没有新增复杂代码前，推荐使用：

- `data/exports/synthesis/`

理由：

- 已属于 repo 可见、稳定、可导出的 Markdown 区域
- 不会与 `items` 主存储混淆
- 后续 `publish` 可以从这里取稿

## 4. 文件命名建议

建议文件名包含：

- 日期
- 产物类型
- 简短 slug

示例：

- `2026-03-14-topic-article-ai-tools-roundup.md`
- `2026-03-14-period-recap-last-3-days-ai.md`
- `2026-03-14-project-note-message-rendering.md`

## 5. 最小 frontmatter

```yaml
id: synthesis_20260314_xxxx
artifact_type: topic_article
title: AI 工具输入阶段回顾
created_at: 2026-03-14T12:00:00+08:00
created_by: ai-flow-synthesis
scope_type: topic
scope_ref: ai
source_item_ids:
  - item_20260314_abcd
  - item_20260314_efgh
publish_status: draft
```

## 6. publish 约束

`ai-flow-publish` 当前应把这些文稿当作“已存在的待发布产物”。

支持的当前路径：

- 本地保留在 `data/exports/synthesis/`
- 导出到 `SiYuan`
- 未来给 `IM` 发标题级提醒

## 7. skill 行为约束

`ai-flow-synthesis` 当前应：

- 先基于 repo 中已有条目组织高质量文稿
- 产出 Markdown 草稿
- 明确这份产物是 `draft` 还是已准备发布

`ai-flow-publish` 当前应：

- 如果产物不存在，先回退到 `synthesis`
- 如果产物已存在，再决定是否写到 `SiYuan`
- 不把“发布”与“生成”混在一起

## 8. 一句话原则

> synthesis 先产稿，publish 再投递；两者分开，状态才清楚。
