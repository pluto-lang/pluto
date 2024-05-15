import fs from "fs";
import { join } from "path";
import { parse } from "dotenv";
import { expand } from "dotenv-expand";

const GLOBAL_ENV_FILES = [`.env`, `.env.local`];
const GLOBAL_TEST_ENV_FILES = [`.env.test`, `.env.test.local`];
const STACK_ENV_FILES = [`.env.{stack}`, `.env.{stack}.local`];
const STACK_TEST_ENV_FILES = [`.env.{stack}.test`, `.env.{stack}.test.local`];

type EnvVarMap = { [key: string]: string };

export function loadDotEnvs(envDir: string, stack: string, testMode: boolean = false) {
  // Construct the path to the `.env` files based on priority.
  const envPaths = GLOBAL_ENV_FILES.map((f) => join(envDir, f));
  if (testMode) {
    envPaths.push(...GLOBAL_TEST_ENV_FILES.map((f) => join(envDir, f)));
  }
  envPaths.push(...STACK_ENV_FILES.map((f) => join(envDir, f.replace("{stack}", stack))));
  if (testMode) {
    envPaths.push(...STACK_TEST_ENV_FILES.map((f) => join(envDir, f.replace("{stack}", stack))));
  }

  // Load the `.env` files according to their order of priority. The most recent one will supersede
  // the previous ones.
  const envs: EnvVarMap = {};
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const parsed = parse(fs.readFileSync(envPath));
      const expanded = expand({ parsed: parsed, processEnv: {} });
      if (expanded.error) {
        throw expanded.error;
      }
      Object.assign(envs, expanded.parsed);
    }
  }

  for (const [key, value] of Object.entries(envs)) {
    process.env[key] = value;
  }

  return envs;
}
