import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import * as model from "./model";
import logger from "./log";

export const PLUTO_DIR = ".pluto";
export const PLUTO_CONFIG_FILE = `${PLUTO_DIR}/pluto.yml`;

export const version = require("../package.json").version;

export function loadConfig(): model.Project {
  if (!fs.existsSync(PLUTO_CONFIG_FILE)) {
    logger.error("This is not a Pluto project.");
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(PLUTO_CONFIG_FILE);
    const obj = yaml.load(content.toString());
    return Object.assign(new model.Project("temp"), obj) as model.Project;
  } catch (e) {
    logger.error("Failed to parse the configuration file.");
    process.exit(1);
  }
}

export function saveConfig(proj: model.Project, basedir: string = "") {
  const dirpath = path.join(basedir, PLUTO_DIR);
  const configPath = path.join(basedir, PLUTO_CONFIG_FILE);
  console.log(dirpath, configPath);
  if (!fs.existsSync(dirpath)) {
    fs.mkdirSync(dirpath, { recursive: true });
  }

  const content = yaml.dump(proj, { noRefs: true });
  fs.writeFileSync(configPath, content);
}