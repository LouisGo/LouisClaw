import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { Item } from "../../domain/item.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { fileExists, listFiles, readTextFile, writeTextFile } from "../../shared/fs.js";
import { dateStamp, formatLocalDateTime, nowIso } from "../../shared/time.js";
import { fileSlug } from "../../shared/text.js";

export interface ExternalResearchPrepareResult {
  requestPath?: string;
  outputPath?: string;
  topicLabel?: string;
  localItemCount: number;
  skippedReason?: string;
}

export class ExternalResearchService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository
  ) {}

  prepareMorningTopicRequest(): ExternalResearchPrepareResult {
    if (!this.config.externalResearch.enabled) {
      return {
        localItemCount: 0,
        skippedReason: "external_research_disabled"
      };
    }

    const canonicalTopic = this.config.morningTopic.subscriptions[0];
    if (!canonicalTopic) {
      return {
        localItemCount: 0,
        skippedReason: "no_topic_subscription"
      };
    }

    const topicSlug = fileSlug(canonicalTopic, "topic");
    const localItems = this.findMatchingItems(canonicalTopic);
    if (!localItems.length) {
      return {
        topicLabel: canonicalTopic,
        localItemCount: 0,
        skippedReason: "no_local_material"
      };
    }

    if (localItems.length >= this.config.externalResearch.minLocalItems) {
      return {
        topicLabel: canonicalTopic,
        localItemCount: localItems.length,
        skippedReason: "local_material_sufficient"
      };
    }

    const today = dateStamp();
    const outputPath = path.join(this.config.paths.researchPackets, `${today}-${topicSlug}.md`);
    if (fileExists(outputPath)) {
      return {
        topicLabel: canonicalTopic,
        localItemCount: localItems.length,
        outputPath,
        skippedReason: "packet_already_exists"
      };
    }

    const requestPath = path.join(this.config.paths.researchRequests, `${today}-${topicSlug}-request.md`);
    const body = renderRequestBody(canonicalTopic, localItems, outputPath, this.config.externalResearch.maxSources);

    writeTextFile(requestPath, matter.stringify(body, {
      id: `research_request:${today}:${topicSlug}`,
      topic_label: canonicalTopic,
      topic_slug: topicSlug,
      created_at: nowIso(),
      created_by: "ai-flow-research-request",
      status: "pending",
      local_item_count: localItems.length,
      max_sources: this.config.externalResearch.maxSources,
      output_path: outputPath,
      source_policy: "web-only-when-local-is-insufficient"
    }));

    return {
      requestPath,
      outputPath,
      topicLabel: canonicalTopic,
      localItemCount: localItems.length
    };
  }

  latestPendingRequestPath(): string | undefined {
    const files = listFiles(this.config.paths.researchRequests, ".md");
    for (const filePath of files.reverse()) {
      const parsed = matter(readTextFile(filePath));
      if (parsed.data.status === "pending") {
        return filePath;
      }
    }

    return undefined;
  }

  latestResearchPacketPath(): string | undefined {
    const files = listFiles(this.config.paths.researchPackets, ".md").slice(-this.config.openclawContext.maxPackets);
    return files[files.length - 1];
  }

  private findMatchingItems(topicLabel: string): Item[] {
    const lowered = topicLabel.toLowerCase();
    return this.itemRepository.loadAll().filter((item) => {
      const haystack = `${item.topic || ""} ${item.title || ""} ${item.summary || ""} ${item.normalized_content || ""} ${item.raw_content || ""}`.toLowerCase();
      return lowered.split(/\s+/).every((token) => !token || haystack.includes(token));
    });
  }
}

function renderRequestBody(topicLabel: string, localItems: Item[], outputPath: string, maxSources: number): string {
  const localLines = localItems.length
    ? localItems.slice(0, 5).map((item) => `- ${formatLocalDateTime(item.capture_time)}｜${item.summary || item.title || item.id} (${item.id})`)
    : ["- 当前本地几乎没有足够材料，才允许触发外部资料补充。"];

  return [
    `# External Research Request｜${topicLabel}`,
    "",
    "## Goal",
    `为晨间专题补足外部公开资料，但仅限这个主题：${topicLabel}`,
    "",
    "## Hard Boundaries",
    `- 最多使用 ${maxSources} 个外部来源。`,
    "- 优先官方工程博客、调查报告、成熟工具厂商、知名研究或平台文章。",
    "- 不做开放式漫游，不追热点新闻，不扩展到无关子议题。",
    "- 目标是补背景、现状、实践方法，不是写全行业综述。",
    "- 如果 3-4 个高质量来源已经足够，请提前停止。",
    "- 输出必须写入 frontmatter 指定的 output_path。",
    "",
    "## Local Context Already Available",
    ...localLines,
    "",
    "## Required Output",
    `- 生成一份 research packet markdown 到：${outputPath}`,
    "- 内容包含：结论、6 个以内关键发现、来源链接、哪些结论可信、哪些仍不确定。",
    "- frontmatter 里必须写 topic_label、created_at、source_urls、confidence_note。",
    ""
  ].join("\n");
}
