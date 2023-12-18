import path from "path";
import fs from "fs";
import { engine, runtime } from "@plutolang/base";
import { createProject } from "../builder";
import logger from "../log";
import { dumpProject } from "../utils";
import { ensureDirSync } from "fs-extra";

const TEMPLATE_DIR = path.join(__dirname, "../../template");

interface NewOptions {
  name?: string;
  stack?: string;
  platform?: runtime.Type;
  engine?: engine.Type;
}

export async function create(opts: NewOptions) {
  const proj = await createProject({
    name: opts.name,
    stack: opts.stack,
    rtType: opts.platform,
    engType: opts.engine,
  });

  genInitFiles(proj.name);
  const pkgJsonPath = path.join(proj.name, "package.json");
  const pkgJson = fs.readFileSync(pkgJsonPath).toString();
  fs.writeFileSync(pkgJsonPath, pkgJson.replaceAll("${project_name}", proj.name));

  dumpProject(proj);
  logger.info("Created a project,", proj.name);
}

function genInitFiles(destdir: string) {
  ensureDirSync(destdir);

  const queue: string[] = [""];
  while (queue.length) {
    const partProjDir = queue.shift()!;
    const tmplCurDir = path.join(TEMPLATE_DIR, partProjDir);
    const projCurDir = path.join(destdir, partProjDir);

    const files = fs.readdirSync(tmplCurDir);
    files.forEach((file) => {
      const srcPath = path.join(tmplCurDir, file);
      const destPath = path.join(projCurDir, file);

      if (fs.lstatSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        fs.mkdirSync(destPath, { recursive: true });
        queue.push(path.join(partProjDir, file));
      }
    });
  }
}
