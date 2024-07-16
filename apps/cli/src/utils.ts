import * as os from "os";
import assert from "assert";
import * as path from "path";
import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import updateNotifier from "update-notifier";
import { config } from "@plutolang/base";
import { StackState } from "@plutolang/base/config";
import { stackStateFile } from "./commands/utils";

// eslint-disable-next-line
const packageJson = require("../package.json");
const packageName = packageJson.name;
export const version = packageJson.version;

/** The default directory where the Pluto compilation output is stored. */
export const PLUTO_PROJECT_OUTPUT_DIR = ".pluto";

/** The relative path from the project's root directory to the pluto configuration file. */
export const PLUTO_PROJECT_CONFIG_PATHS = [
  "pluto.yml",
  "pluto.yaml",
  ".pluto/pluto.yml",
  ".pluto/pluto.yaml",
];

/** The pluto system configuration file's absolute path. */
export const PLUTO_SYSTEM_CONFIG_DIR = path.resolve(os.homedir(), ".pluto");

/**
 * Reads the project name from the package.json file located at the root of the given path, and returns it.
 * @param projectRoot The root directory of the project.
 * @returns The project name from the package.json file.
 */
export function getProjectName(projectRoot: string): string {
  //eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(path.join(projectRoot, "package.json")).name;
}

/**
 * Load the project configuration from the default configuration path.
 * @param projectRoot The root directory of the project.
 */
export function loadProject(projectRoot: string): config.Project {
  const plutoConfigFile = locateConfigFile(projectRoot);
  assert(plutoConfigFile, "The project configuration file is not found.");

  const content = fs.readFileSync(plutoConfigFile);
  const projectName = getProjectName(projectRoot);
  const project = config.Project.loadFromYaml(projectName, projectRoot, content.toString());

  // Load the stack state from the state file.
  project.stacks.forEach((stack) => {
    const { stateDir } = getStackBasicDirs(projectRoot, stack.name);
    const stateFilepath = stackStateFile(stateDir);
    if (fs.existsSync(stateFilepath)) {
      stack.state = loadStackState(stateFilepath);
    } else {
      stack.state = {
        deployed: false,
      };
    }
  });
  return project;
}

/**
 * Load the stack state from the given file path in JSON format.
 * @param stateFilepath - The file path to load the stack state.
 * @returns The stack state.
 */
export function loadStackState(stateFilepath: string): StackState {
  const data = fs.readFileSync(stateFilepath);
  return JSON.parse(data.toString());
}

/**
 * Dump the stack state to the given file path in JSON format.
 * @param stateFilepath - The file path to dump the stack state.
 * @param stackState - The stack state to dump.
 */
export function dumpStackState(stateFilepath: string, stackState: StackState) {
  fs.writeFileSync(stateFilepath, JSON.stringify(stackState, null, 2));
}

/**
 * Dump the project to the default configuration path.
 */
export function dumpProject(project: config.Project) {
  const rootpath = project.rootpath;

  // Remove the state field from the project before dumping it.
  const proj = project.deepCopy();
  proj.stacks.forEach((stack) => {
    delete (stack as any).state;
  });
  // Remove the `name` and `rootpath` fields from the project before dumping it. They're loaded
  // automatically when running the `pluto` command.
  delete (proj as any).name;
  delete (proj as any).rootpath;

  const configFile =
    locateConfigFile(rootpath) ?? path.join(rootpath, PLUTO_PROJECT_CONFIG_PATHS[0]);
  fs.ensureFileSync(configFile);

  const content = yaml.dump(proj, { sortKeys: true });
  fs.writeFileSync(configFile, content);
}

/**
 * Check if the given path is a Pluto project.
 * @param rootpath The root directory of the project.
 */
export function isPlutoProject(rootpath: string): boolean {
  return (
    locateConfigFile(rootpath) &&
    fs.existsSync(path.resolve(rootpath, "package.json")) &&
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(path.resolve(rootpath, "package.json")).name
  );
}

/**
 * Check whether the Pluto command-line tool is outdated.
 */
export function checkUpdate() {
  const ONE_HOUR = 60 * 60 * 1000;
  updateNotifier({
    pkg: { name: packageName, version: version },
    updateCheckInterval: ONE_HOUR,
  }).notify({ isGlobal: true, defer: false });
}

export function getStackBasicDirs(projectRoot: string, stackName: string) {
  const baseDir = path.join(projectRoot, PLUTO_PROJECT_OUTPUT_DIR, stackName);
  const closuresDir = path.join(baseDir, "closures");
  const generatedDir = path.join(baseDir, "generated");
  const stateDir = path.join(baseDir, "state");
  return { baseDir, closuresDir, generatedDir, stateDir };
}

/**
 * Prepare the directories for the stack, including:
 * - The directory stores closures separated from user code.
 * - The directory stores the generated files, such as the Pulumi code, architecture diagram, etc.
 * - The directory contains state files generated by the adapter working with this stack.
 */
export async function prepareStackDirs(projectRoot: string, stackName: string) {
  const { baseDir, closuresDir, generatedDir, stateDir } = getStackBasicDirs(
    projectRoot,
    stackName
  );
  fs.ensureDirSync(closuresDir);
  fs.ensureDirSync(generatedDir);
  fs.ensureDirSync(stateDir);
  return { baseDir, closuresDir, generatedDir, stateDir };
}

function locateConfigFile(rootpath: string) {
  for (const configPath of PLUTO_PROJECT_CONFIG_PATHS) {
    const configFile = path.join(rootpath, configPath);
    if (fs.existsSync(configPath)) {
      return configFile;
    }
  }
  return;
}
