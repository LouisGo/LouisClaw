import { AppConfig } from "../../app/config.js";
import { Item } from "../../domain/item.js";
import { HeuristicClassifyService } from "./heuristic-classify.service.js";
import { LlmClassifyService } from "./llm-classify.service.js";

export class ClassifyService {
  private readonly heuristic = new HeuristicClassifyService();
  private readonly llm: LlmClassifyService;

  constructor(private readonly config: AppConfig) {
    this.llm = new LlmClassifyService(config);
  }

  async run(item: Item): Promise<Item> {
    const mode = this.config.ai.classifierMode;

    if (mode === "heuristic") {
      return this.heuristic.run(item);
    }

    if (mode === "llm") {
      return this.llm.run(item);
    }

    if (this.llm.isEnabled()) {
      try {
        return await this.llm.run(item);
      } catch {
        return this.heuristic.run(item);
      }
    }

    return this.heuristic.run(item);
  }
}
