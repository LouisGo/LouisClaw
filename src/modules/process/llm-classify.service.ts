import { readTextFile } from "../../shared/fs.js";
import { Item } from "../../domain/item.js";
import { AppConfig } from "../../app/config.js";
import { classificationResultSchema } from "./classify.schema.js";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    return fenced[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("No JSON object found in model response");
}

function buildUserPrompt(item: Item): string {
  return [
    "Classify this personal information item.",
    "Return JSON only.",
    "",
    JSON.stringify({
      id: item.id,
      source: item.source,
      device: item.device,
      capture_time: item.capture_time,
      content_type: item.content_type,
      title: item.title,
      url: item.url,
      normalized_content: item.normalized_content
    }, null, 2)
  ].join("\n");
}

export class LlmClassifyService {
  private readonly systemPrompt: string;

  constructor(private readonly config: AppConfig) {
    this.systemPrompt = readTextFile(new URL("../../../prompts/classify-item.md", import.meta.url));
  }

  isEnabled(): boolean {
    return Boolean(this.config.ai.apiKey && this.config.ai.model);
  }

  async run(item: Item): Promise<Item> {
    if (item.decision === "drop") {
      return item;
    }

    if (!this.isEnabled()) {
      throw new Error("LLM classifier is not configured");
    }

    const response = await fetch(`${this.config.ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.ai.apiKey as string}`
      },
      body: JSON.stringify({
        model: this.config.ai.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: buildUserPrompt(item) }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`LLM classify failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM classify returned empty content");
    }

    const parsed = classificationResultSchema.parse(JSON.parse(extractJson(content)));

    return {
      ...item,
      topic: parsed.topic,
      tags: parsed.tags,
      summary: parsed.summary,
      value_score: parsed.value_score,
      decision: parsed.decision,
      reason: parsed.reason,
      status: "processed"
    };
  }
}
