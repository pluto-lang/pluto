import * as path from "path";
import * as fs from "fs-extra";
import toml from "@iarna/toml";

const POETRY_SOURCE_PRIORITY = ["default", "primary", "secondary", "supplemental"] as const;

type PriorityType = (typeof POETRY_SOURCE_PRIORITY)[number];

interface PoetrySource {
  readonly name: string;
  readonly url: string;
  readonly priority?: PriorityType;
}

export interface IndexUrl {
  readonly url: string;
  readonly primary: boolean;
}

export async function getIndexUrls(): Promise<IndexUrl[]> {
  // TODO: currently, we assume the current working directory is the root of the workspace. We need
  // to find a way to get the root of the workspace.
  const rootpath = process.cwd();

  let indexUrls: IndexUrl[] = [];
  const pyprojectToml = await loadPyprojectToml(rootpath);
  if (pyprojectToml && isManagedByPoetry(pyprojectToml)) {
    indexUrls = getPoetrySources(pyprojectToml);
  } else if (await fs.exists(path.join(rootpath, "requirements.txt"))) {
    const requirements = await fs.readFile(path.join(rootpath, "requirements.txt"), "utf-8");
    indexUrls = getIndexUrlsFromRequirements(requirements);
  }

  // ensure there is only one primary source
  let hasPrimary = false;
  for (const source of indexUrls) {
    if (!source.primary) continue;

    if (hasPrimary) {
      (source as any).primary = false;
    } else {
      hasPrimary = true;
    }
  }

  return indexUrls;
}

async function loadPyprojectToml(rootpath: string) {
  const tomlPath = path.join(rootpath, "pyproject.toml");
  if (!(await fs.exists(tomlPath))) {
    return;
  }

  const content = await fs.readFile(tomlPath, "utf-8");
  return toml.parse(content);
}

function isManagedByPoetry(pyprojectToml: any): boolean {
  const tool = pyprojectToml["tool"];
  return tool?.poetry !== undefined;
}

function getPoetrySources(pyprojectToml: any): IndexUrl[] {
  const sources: PoetrySource[] | undefined = pyprojectToml["tool"]["poetry"]["source"];
  if (!sources) {
    return [];
  }

  sources.sort((a, b) => {
    const priorityA = POETRY_SOURCE_PRIORITY.indexOf(a.priority || "primary");
    const priorityB = POETRY_SOURCE_PRIORITY.indexOf(b.priority || "primary");
    return priorityA - priorityB;
  });

  return sources.map((s) => {
    return { url: s.url, primary: s.priority === "primary" || s.priority === "default" };
  });
}

function getIndexUrlsFromRequirements(requirements: string): IndexUrl[] {
  const lines = requirements.split("\n");
  const indexUrls: IndexUrl[] = [];
  for (const line of lines) {
    const match = line.match(/--(extra-)?index-url\s+(.+)/);
    if (!match) continue;

    const primary = !match[1];
    const url = match[2];
    indexUrls.push({ url, primary });
  }

  return indexUrls;
}
