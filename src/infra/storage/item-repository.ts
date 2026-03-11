import path from "node:path";
import { Item } from "../../domain/item.js";
import { AppConfig } from "../../app/config.js";
import { listFiles, readJsonFile, writeJsonFile } from "../../shared/fs.js";

export class ItemRepository {
  constructor(private readonly config: AppConfig) {}

  filePath(itemId: string): string {
    return path.join(this.config.paths.items, `${itemId}.json`);
  }

  save(item: Item): void {
    writeJsonFile(this.filePath(item.id), item);
  }

  load(itemId: string): Item | undefined {
    return readJsonFile<Item>(this.filePath(itemId));
  }

  loadAll(): Item[] {
    return listFiles(this.config.paths.items, ".json")
      .map((filePath) => readJsonFile<Item>(filePath))
      .filter((item): item is Item => Boolean(item));
  }
}
