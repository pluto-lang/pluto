import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import { project } from "@pluto/base";
import logger from "./log";

export const PLUTO_DIR = ".pluto";
export const PLUTO_CONFIG_FILE = `${PLUTO_DIR}/pluto.yml`;

export const version = require("../package.json").version;

export function loadConfig(): project.Project {
  if (!fs.existsSync(PLUTO_CONFIG_FILE)) {
    logger.error("This is not a Pluto project.");
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(PLUTO_CONFIG_FILE);
    const obj = yaml.load(content.toString());
    return Object.assign(new project.Project("temp"), obj) as project.Project;
  } catch (e) {
    logger.error("Failed to parse the configuration file.");
    process.exit(1);
  }
}

export function saveConfig(proj: project.Project, basedir: string = "") {
  const dirpath = path.join(basedir, PLUTO_DIR);
  const configPath = path.join(basedir, PLUTO_CONFIG_FILE);
  if (!fs.existsSync(dirpath)) {
    fs.mkdirSync(dirpath, { recursive: true });
  }

  const content = yaml.dump(proj, { noRefs: true });
  fs.writeFileSync(configPath, content);
}
