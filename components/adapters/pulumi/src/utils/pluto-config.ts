import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import * as yaml from "js-yaml";

const PLUTO_GLOBAL_CONFIG_PATH = path.join(os.homedir(), ".pluto", "config.yml");

export type PlutoGlobalConfig = { [key: string]: unknown };

export function readPlutoGlobalConfig(): PlutoGlobalConfig {
  let plutoConfig: PlutoGlobalConfig = {};
  if (fs.existsSync(PLUTO_GLOBAL_CONFIG_PATH)) {
    const plutoConfigText = fs.readFileSync(PLUTO_GLOBAL_CONFIG_PATH, "utf-8");
    plutoConfig = yaml.load(plutoConfigText) as PlutoGlobalConfig;
  }
  return plutoConfig;
}

export function savePlutoGlobalConfig(plutoConfig: PlutoGlobalConfig) {
  fs.ensureFileSync(PLUTO_GLOBAL_CONFIG_PATH);
  fs.writeFileSync(PLUTO_GLOBAL_CONFIG_PATH, yaml.dump(plutoConfig));
}
