import fs from "node:fs";
import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { ensureDir, listFiles } from "../../shared/fs.js";
import { sha1 } from "../../shared/hash.js";
import { compactTimestamp } from "../../shared/time.js";

const SUPPORTED_LANDING_EXTENSIONS = [".json", ".md", ".txt"] as const;

export interface LandingFlushResult {
  moved: string[];
  ignored: string[];
}

export interface LandingOverview {
  total: number;
  supported: number;
  ignored: number;
}

export class LandingFileService {
  constructor(private readonly config: AppConfig) {}

  flushToInbox(): LandingFlushResult {
    const files = listFiles(this.config.paths.landing).sort();
    const result: LandingFlushResult = {
      moved: [],
      ignored: []
    };

    files.forEach((filePath) => {
      if (!this.isSupported(filePath)) {
        result.ignored.push(filePath);
        return;
      }

      result.moved.push(this.moveToInbox(filePath));
    });

    return result;
  }

  overview(): LandingOverview {
    const files = listFiles(this.config.paths.landing).sort();
    const supported = files.filter((filePath) => this.isSupported(filePath)).length;

    return {
      total: files.length,
      supported,
      ignored: files.length - supported
    };
  }

  supportedExtensions(): readonly string[] {
    return SUPPORTED_LANDING_EXTENSIONS;
  }

  isSupported(filePath: string): boolean {
    return SUPPORTED_LANDING_EXTENSIONS.includes(path.extname(filePath).toLowerCase() as typeof SUPPORTED_LANDING_EXTENSIONS[number]);
  }

  moveFileToInbox(filePath: string): string {
    return this.moveToInbox(filePath);
  }

  private moveToInbox(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const targetPath = path.join(
      this.config.paths.inbox,
      `${compactTimestamp()}_${sha1(`${filePath}:${Date.now()}`).slice(0, 6)}${ext}`
    );

    ensureDir(path.dirname(targetPath));
    fs.renameSync(filePath, targetPath);
    return targetPath;
  }
}
