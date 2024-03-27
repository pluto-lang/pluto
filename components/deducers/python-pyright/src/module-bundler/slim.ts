import * as fs from "fs-extra";
import { globSync } from "glob";

export function removeUselessFiles(folderPath: string) {
  const patterns = ["**/*.py[c|o]", "**/__pycache__*", "**/*.dist-info*"];
  for (const pattern of patterns) {
    for (const file of globSync(`${folderPath}/${pattern}`)) {
      fs.rmSync(file, { recursive: true });
    }
  }
}
