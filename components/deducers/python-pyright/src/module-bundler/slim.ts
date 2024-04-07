import * as fs from "fs-extra";
import { globSync } from "glob";

export function removeUselessFiles(folderPath: string, patterns?: string[]) {
  patterns = patterns ?? ["**/*.py[c|o]", "**/__pycache__*", "**/*.dist-info*"];
  for (const pattern of patterns) {
    for (const file of globSync(`${folderPath}/${pattern}`)) {
      fs.rmSync(file, { recursive: true });
    }
  }
}

export function getStripCommand(targetFolder: string): string[] {
  return ["find", targetFolder, "-name", "*.so", "-exec", "strip", "{}", ";"];
}
