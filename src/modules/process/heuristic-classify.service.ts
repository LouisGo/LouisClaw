import { Item } from "../../domain/item.js";

function detectTopic(item: Item): string {
  const text = `${item.title || ""} ${item.normalized_content}`.toLowerCase();
  if (text.includes("ai") || text.includes("agent") || text.includes("llm")) {
    return "ai";
  }
  if (text.includes("code") || text.includes("typescript") || text.includes("javascript") || item.content_type === "code") {
    return "engineering";
  }
  if (item.content_type === "video_link") {
    return "video";
  }
  return "general";
}

export class HeuristicClassifyService {
  run(item: Item): Item {
    if (item.decision === "drop") {
      return item;
    }

    const topic = detectTopic(item);
    const hasActionCue = /todo|follow up|待办|行动|研究|看看|试试/i.test(item.normalized_content);
    const longEnough = item.normalized_content.length >= 40 || Boolean(item.url);

    return {
      ...item,
      topic,
      tags: [topic, item.content_type],
      summary: item.title || item.normalized_content.slice(0, 120),
      value_score: hasActionCue ? 85 : longEnough ? 70 : 45,
      decision: hasActionCue ? "follow_up" : longEnough ? "digest" : "archive",
      reason: hasActionCue
        ? "Contains action or follow-up signals"
        : longEnough
          ? "Likely worth reviewing later"
          : "Useful enough to keep but not urgent",
      status: "processed"
    };
  }
}
