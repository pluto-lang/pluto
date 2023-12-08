import { homedir } from "os";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { ensureFileSync } from "fs-extra";
import { dump, load } from "js-yaml";
import { config } from "@plutolang/base";

// eslint-disable-next-line
export const version = require("../package.json").version;

/** The default directory where the Pluto compilation output is stored. */
export const PLUTO_PROJECT_OUTPUT_DIR = ".pluto";

/** The relative path from the project's root directory to the pluto configuration file. */
export const PLUTO_PROJECT_CONFIG_PATH = ".pluto/pluto.yml";

/** The pluto system configuration file's absolute path. */
export const PLUTO_SYSTEM_CONFIG_DIR = resolve(homedir(), ".pluto");

/**
 * Reads the project name from the package.json file located at the root of the given path, and returns it.
 * @param projectRoot The root directory of the project.
 * @returns The project name from the package.json file.
 */
export function getProjectName(projectRoot: string): string {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(join(projectRoot, "package.json")).name;
}

/**
 * Load the project configuration from the default configuration path.
 * @param projectRoot The root directory of the project.
 */
export function loadProject(projectRoot: string): config.Project {
  const content = readFileSync(join(projectRoot, PLUTO_PROJECT_CONFIG_PATH));
  const obj = load(content.toString());
  const project = new config.Project(getProjectName(projectRoot), projectRoot);
  return Object.assign(project, obj);
}

/**
 * Dump the project to the default configuration path.
 */
export function dumpProject(project: config.Project) {
  const rootpath = project.rootpath;

  const obj = project as any;
  delete obj.name;
  delete obj.rootpath;
  const content = dump(project, { sortKeys: true });

  const configFile = join(rootpath, PLUTO_PROJECT_CONFIG_PATH);
  ensureFileSync(configFile);
  writeFileSync(configFile, content);
}

/**
 * Check if the given path is a Pluto project.
 * @param rootpath The root directory of the project.
 */
export function isPlutoProject(rootpath: string): boolean {
  return (
    existsSync(join(rootpath, PLUTO_PROJECT_CONFIG_PATH)) &&
    existsSync(join(rootpath, "package.json")) &&
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(join(rootpath, "package.json")).name
  );
}
