import crypto from "node:crypto";

export function sha1(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex");
}
