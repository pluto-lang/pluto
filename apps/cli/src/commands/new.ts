import path from "path";
import fs from "fs";
import { engine, runtime } from "@pluto/base";
import { createProject } from "../builder";
import { saveConfig } from "../utils";
import logger from "../log";

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

  if (process.env.DEBUG) {
    logger.debug("New project: ", proj);
  }
  saveConfig(proj, proj.name);

  genInitFiles(proj.name);
  const pkgJsonPath = path.join(proj.name, "package.json");
  const pkgJson = fs.readFileSync(pkgJsonPath).toString();
  fs.writeFileSync(pkgJsonPath, pkgJson.replaceAll("${project_name}", proj.name));

  logger.info("Created a project,", proj.name);
}

function genInitFiles(destdir: string) {
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
