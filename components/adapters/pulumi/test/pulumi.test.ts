import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";
import { test } from "vitest";
import { arch, project } from "@plutolang/base";
import { PulumiAdapter } from "../src/pulumi";

export const PLUTO_DIR = "../../testapps/tester/.pluto";
export const PLUTO_CONFIG_FILE = `${PLUTO_DIR}/pluto.yml`;

export function loadConfig(): project.Project {
  const content = fs.readFileSync(PLUTO_CONFIG_FILE);
  const obj = yaml.load(content.toString());
  return Object.assign(new project.Project("temp"), obj) as project.Project;
}

export function loadArchRef(): arch.Architecture {
  const content = fs.readFileSync(path.resolve("./", PLUTO_DIR, "dev/arch.yml"));
  return yaml.load(content.toString()) as arch.Architecture;
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

test.skip(
  "pulumi test",
  async () => {
    process.env.AWS_REGION = "us-east-1";

    const proj = loadConfig();
    const archRef = loadArchRef();

    const adapter = new PulumiAdapter({
      project: proj.name,
      stack: proj.getStack(proj.current)!,
      rootpath: path.dirname(PLUTO_DIR),
      entrypoint: path.resolve("./", PLUTO_DIR, "dev/compiled/pulumi.js"),
      workdir: path.resolve("./", PLUTO_DIR, "dev/compiled"),
      archRef: archRef,
      log: console.log,
    });

    await adapter.deploy();
    await adapter.destroy();
  },
  { timeout: 30 * 60 * 1000 }
);
