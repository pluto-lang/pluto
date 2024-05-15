import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { test, expect } from "vitest";
import { loadDotEnvs } from "./env";

test("can load env file", async () => {
  const tempdir = await mkdtemp(join(tmpdir(), "env-test"));

  const envFile = `${tempdir}/.env`;
  await writeFile(envFile, "TEST1=1\nTEST2=2\n");

  const loaded = loadDotEnvs(tempdir, "");

  expect(loaded).toBeDefined();
  expect(loaded.TEST1).toBe("1");
  expect(loaded.TEST2).toBe("2");
  expect(process.env.TEST1).toBe("1");
  expect(process.env.TEST2).toBe("2");

  // cleanup
  rm(tempdir, { recursive: true });
});

test("can load env file with expansion", async () => {
  const tempdir = await mkdtemp(join(tmpdir(), "env-test"));

  const envFile = `${tempdir}/.env`;
  await writeFile(envFile, "BASE_VAR=base\nOTHER_VAR=${BASE_VAR}_tail\n");

  const loaded = loadDotEnvs(tempdir, "");

  expect(loaded.BASE_VAR).toBe("base");
  expect(loaded.OTHER_VAR).toBe("base_tail");

  // cleanup
  rm(tempdir, { recursive: true });
});

test("can load env file in priority order", async () => {
  const tempdir = await mkdtemp(join(tmpdir(), "env-test"));

  const globalEnv = `${tempdir}/.env`;
  await writeFile(globalEnv, "TEST1=global\n");

  const stackEnv = `${tempdir}/.env.stack`;
  await writeFile(stackEnv, "TEST1=stack\n");

  const loaded = loadDotEnvs(tempdir, "stack");
  expect(loaded.TEST1).toBe("stack");

  const testEnv = `${tempdir}/.env.stack.test`;
  await writeFile(testEnv, "TEST1=test\n");

  const loadedTest = loadDotEnvs(tempdir, "stack", true);
  expect(loadedTest.TEST1).toBe("test");

  // cleanup
  rm(tempdir, { recursive: true });
});
