import * as path from "path";
import * as fs from "fs-extra";
import { PlatformType } from "@plutolang/base";
import { Architecture, Module, ModuleType, Runtime } from "./types";

export interface Metadata {
  readonly runtime: Runtime;
  readonly architecture: Architecture;
  readonly platform?: PlatformType;
  readonly modules: readonly Module[];

  done: boolean;
}

const METADATA_FILE = "metadata.json";

export function dumpMetaFile(targetFolder: string, metadata: Metadata) {
  const metaPath = path.join(targetFolder, METADATA_FILE);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
}

export function loadMetaFile(targetFolder: string): Metadata | undefined {
  const metaPath = path.join(targetFolder, METADATA_FILE);
  if (!fs.existsSync(metaPath)) {
    return;
  }
  const content = fs.readFileSync(metaPath, "utf-8");
  return JSON.parse(content);
}

export function sameMetadata(meta1: Metadata, meta2: Metadata, caredType?: ModuleType) {
  if (
    meta1.runtime !== meta2.runtime ||
    meta1.architecture !== meta2.architecture ||
    meta1.platform !== meta2.platform
  )
    return false;

  if (!caredType) {
    return (
      meta1.modules.length === meta2.modules.length &&
      meta1.modules.every((m1) => meta2.modules.some((m2) => Module.same(m1, m2)))
    );
  }

  const caredModules1 = meta1.modules.filter((m) => m.type === caredType);
  const caredModules2 = meta2.modules.filter((m) => m.type === caredType);
  return (
    caredModules1.length === caredModules2.length &&
    caredModules1.every((m1) => caredModules2.some((m2) => Module.same(m1, m2)))
  );
}
