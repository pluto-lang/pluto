import path from "path";
import assert from "assert";
import * as fs from "fs-extra";
import { ProvisionType, PlatformType, LanguageType } from "@plutolang/base";
import logger from "../log";
import { dumpProject } from "../utils";
import { createProject } from "../builder";
import { formatError } from "./utils";

const TEMPLATE_DIR = path.join(__dirname, "../../template");

export interface NewOptions {
  name?: string;
  stack?: string;
  language?: LanguageType;
  platform?: PlatformType;
  provision?: ProvisionType;
}

export async function create(opts: NewOptions) {
  const proj = await createProject({
    name: opts.name,
    stack: opts.stack,
    language: opts.language,
    platformType: opts.platform,
    provisionType: opts.provision,
  }).catch(formatError);
  assert(proj, "Failed to create a project.");

  genInitFiles(proj.name, proj.language);
  const pkgJsonPath = path.join(proj.name, "package.json");
  const pkgJson = fs.readFileSync(pkgJsonPath).toString();
  fs.writeFileSync(pkgJsonPath, pkgJson.replaceAll("${project_name}", proj.name));

  dumpProject(proj);
  logger.info("Created a project,", proj.name);
}

export function genInitFiles(destdir: string, language: string) {
  fs.ensureDirSync(destdir);

  const queue: string[] = [""];
  while (queue.length) {
    const partProjDir = queue.shift()!;
    const tmplCurDir = path.join(TEMPLATE_DIR, language, partProjDir);
    const projCurDir = path.join(destdir, partProjDir);

    const files = fs.readdirSync(tmplCurDir);
    files.forEach((file) => {
      const srcPath = path.join(tmplCurDir, file);
      const destPath = path.join(projCurDir, file);

      if (fs.lstatSync(srcPath).isFile()) {
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      } else {
        fs.mkdirSync(destPath, { recursive: true });
        queue.push(path.join(partProjDir, file));
      }
    });
  }
}
