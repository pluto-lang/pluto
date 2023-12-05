import fs from "fs";
import path from "path";
import { test, expect, beforeAll, afterAll } from "vitest";
import { arch, simulator as sim } from "@plutolang/base";
import { Simulator } from "./simulator";

const APP_PATH = path.join(__dirname, "../../../../testapps/tester");
const YAML_PATH = path.join(APP_PATH, ".pluto/dev/arch.yml");
const WORK_DIR = path.join(APP_PATH, ".pluto/dev/compiled");

let simulator: Simulator;

beforeAll(async () => {
  const yamlText = fs.readFileSync(YAML_PATH, "utf-8");
  const archRef = arch.parseArchFromYaml(yamlText);
  console.log(archRef);

  simulator = new Simulator();
  expect(async () => await simulator.loadApp(archRef)).not.toThrow();

  await simulator.start();
  expect(async () => simulator.serverUrl).not.toThrow();

  process.env.WORK_DIR = WORK_DIR;
});

afterAll(async () => {
  await simulator.stop();
});

test.skip("run tests", async () => {
  const testerClient = sim.makeSimulatorClient(simulator.serverUrl, "tester");
  const testCases = await testerClient.listTests();
  for (const testCase of testCases) {
    try {
      await testerClient.runTest(testCase);
    } catch (e) {
      console.error(e);
      throw new Error(testCase.description + " should not throw");
    }
  }
});
