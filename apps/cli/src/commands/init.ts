import fs from "fs";
import path from "path";
import assert from "assert";

import { createProject } from "../builder";
import logger from "../log";
import { dumpProject, isPlutoProject } from "../utils";

import { NewOptions, genInitFiles } from "./new";
import { formatError } from "./utils";

export async function init(opts: NewOptions) {
  if (isPlutoProject("./")) {
    logger.error("This directory is already a Pluto project.");
    process.exit(1);
  }

  if (fs.existsSync("package.json")) {
    const pkgJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    if (opts.name !== pkgJson["name"]) {
      logger.error("The project name should be the same as the package name in package.json.");
      process.exit(1);
    }
    opts.name = pkgJson["name"];
  }

  const proj = await createProject({
    name: opts.name,
    stack: opts.stack,
    language: opts.language,
    platformType: opts.platform,
    provisionType: opts.provision,
    rootpath: "./",
  }).catch(formatError);
  assert(proj, "Failed to create a project.");

  genInitFiles("./", proj.language);
  const pkgJsonPath = path.join("./", "package.json");
  const pkgJson = fs.readFileSync(pkgJsonPath).toString();
  fs.writeFileSync(pkgJsonPath, pkgJson.replaceAll("${project_name}", proj.name));

  dumpProject(proj);
  logger.info("Initialized a project,", proj.name);
}
