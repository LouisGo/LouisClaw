import { Item } from "../../domain/item.js";
import { isNoiseText, truncate } from "../../shared/text.js";
import { StateRepository } from "../../infra/storage/state-repository.js";

export class PreprocessService {
  constructor(private readonly stateRepository: StateRepository) {}

  run(item: Item): Item {
    const dedupeIndex = this.stateRepository.loadDedupeIndex();
    const duplicateOf = dedupeIndex[item.dedupe_key];

    if (duplicateOf) {
      return {
        ...item,
        status: "dropped",
        decision: "drop",
        reason: `Duplicate of ${duplicateOf}`,
        summary: "Duplicate content",
        duplicate_of: duplicateOf
      };
    }

    if (isNoiseText(item.normalized_content) && !item.url) {
      return {
        ...item,
        status: "dropped",
        decision: "drop",
        reason: "Low-signal short text",
        summary: "Ignored low-value content"
      };
    }

    dedupeIndex[item.dedupe_key] = item.id;
    this.stateRepository.saveDedupeIndex(dedupeIndex);

    return {
      ...item,
      normalized_content: truncate(item.normalized_content, 4000)
    };
  }
}
