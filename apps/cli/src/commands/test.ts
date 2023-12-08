import fs from "fs";
import path from "path";
import { InvokeCommand, LambdaClient, LogType } from "@aws-sdk/client-lambda";
import { arch, core, engine, project, runtime, simulator } from "@plutolang/base";
import { BuildAdapterByEngine } from "@plutolang/adapters";
import { loadConfig } from "../utils";
import logger from "../log";
import { loadAndDeduce, loadAndGenerate } from "./compile";

interface TestOptions {
  sim: boolean;
  stack?: string;
  deducer: string;
  generator: string;
}

export async function test(entrypoint: string, opts: TestOptions) {
  // Ensure the entrypoint exist.
  if (!fs.existsSync(entrypoint)) {
    throw new Error(`No such file, ${entrypoint}`);
  }

  const proj = loadConfig();
  let sta: project.Stack | undefined;
  if (opts.stack) {
    sta = proj.getStack(opts.stack);
    if (!sta) {
      logger.error("No such stack.");
      process.exit(1);
    }
  } else {
    sta = proj.getStack(proj.current);
    if (!sta) {
      logger.error("There is not existing stack. Please create a new one first.");
      process.exit(1);
    }
  }
  if (opts.sim) {
    sta.runtime = new project.SimulatorRuntime();
    sta.engine = engine.Type.simulator;
  }

  const basicArgs: core.BasicArgs = {
    project: proj.name,
    stack: sta,
    rootpath: path.resolve("."),
  };

  // construct the arch ref from user code
  logger.info("Generating reference architecture...");
  const { archRef } = await loadAndDeduce(opts.deducer, basicArgs, [entrypoint]);

  const testGroupArchs = splitTestGroup(archRef);
  for (let testGroupIdx = 0; testGroupIdx < testGroupArchs.length; testGroupIdx++) {
    await testOneGroup(testGroupIdx, testGroupArchs[testGroupIdx], proj, sta, opts);
  }
}

/**
 * Grouping the testers and each group will be provided with their own dedicated testing environment.
 */
function splitTestGroup(archRef: arch.Architecture): arch.Architecture[] {
  // TODO: grouping the testers
  return [archRef];
}

async function testOneGroup(
  testGroupIdx: number,
  testGroupArch: arch.Architecture,
  proj: project.Project,
  sta: project.Stack,
  opts: TestOptions
) {
  const testId = `test-${testGroupIdx}`;

  const basicArgs: core.BasicArgs = {
    project: proj.name,
    stack: sta,
    rootpath: path.resolve("."),
  };

  // generate the IR code based on the arch ref
  logger.info("Generating the IaC Code and computing modules...");
  const outdir = path.join(".pluto", sta.name, testId);
  const generateResult = await loadAndGenerate(opts.generator, basicArgs, testGroupArch, outdir);

  const workdir = path.resolve("./", outdir, `compiled`);
  // build the adapter based on the engine type
  const adpt = BuildAdapterByEngine(sta.engine, {
    ...basicArgs,
    entrypoint: generateResult.entrypoint!,
    workdir: workdir,
    archRef: testGroupArch,
  });
  if (!adpt) {
    logger.error("No such engine.");
    process.exit(1);
  }

  const tmpSta = new project.Stack(`${sta.name}-${testId}`, sta.runtime, sta.engine);

  try {
    logger.info("Applying...");
    const applyResult = await adpt.deploy();
    logger.info("Successfully applied!");

    if (sta.runtime.type == runtime.Type.Simulator) {
      const simServerUrl = applyResult.outputs!["simulatorServerUrl"];
      for (const resourceName in testGroupArch.resources) {
        const resource = testGroupArch.resources[resourceName];
        if (resource.type !== "Tester") {
          continue;
        }

        const description = eval(resource.parameters.find((p) => p.index === 0)!.value);
        if (description == undefined) {
          throw new Error(`The description of ${resourceName} is not found.`);
        }

        const simClient = simulator.makeSimulatorClient(simServerUrl, description);
        const testerClient = new SimTesterClient(description, simClient);

        await testerClient.runTests();
      }
    } else {
      const testers = listAllTester(applyResult.outputs!);
      for (const tester of testers) {
        const testerClient = buildTesterClient(tmpSta, tester);
        await testerClient.runTests();
      }
    }

    logger.info("Destroying...");
    await adpt.destroy();
    logger.info("Successfully destroyed!");
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
    } else {
      logger.error(e);
    }
    process.exit(1);
  }
}

interface TestCase {
  description: string;
  fnResourceId: string;
}

interface Tester {
  description: string;
  testCases: TestCase[];
}

// eslint-disable-next-line
function listAllTester(outputs: { [key: string]: any }): Tester[] {
  const testers: Tester[] = [];
  for (const key in outputs) {
    const val = outputs[key];
    if (!val["testCases"] || !val["description"]) {
      continue;
    }
    testers.push(val);
  }
  return testers;
}

/**
 * TesterClient is the client for running the tests.
 * The tester client for different runtimes will be implemented in different ways.
 * During testing, it will invoke the test function.
 */
interface TesterClient {
  runTests(): Promise<void>;
}

function buildTesterClient(sta: project.Stack, tester: Tester): TesterClient {
  switch (sta.runtime.type) {
    case runtime.Type.AWS:
      return new AwsTesterClient(tester);
    case runtime.Type.K8s:
    case runtime.Type.Azure:
    case runtime.Type.GCP:
    case runtime.Type.AliCloud:
    case runtime.Type.Simulator:
    case runtime.Type.Custom:
      throw new Error("Not implemented yet.");
    default:
      throw new Error(`Unknown runtime type, ${sta.runtime.type}`);
  }
}

class AwsTesterClient implements TesterClient {
  private readonly description: string;
  private readonly testCases: TestCase[];
  private readonly lambdaClient: LambdaClient;

  constructor(tester: Tester) {
    this.lambdaClient = new LambdaClient({});
    this.description = tester.description;
    this.testCases = tester.testCases;
  }

  public async runTests(): Promise<void> {
    logger.info(`+ Test Group: ${this.description}`);
    for (const testCase of this.testCases) {
      logger.info(`  + Test Case: ${testCase.description}`);
      try {
        await this.runOne(testCase);
        logger.info(`  ✔️ Passed`);
      } catch (e) {
        if (e instanceof Error) {
          logger.error("  ✖️ Failed, ", e.message);
        } else {
          logger.error("  ✖️ Failed, ", e);
        }
      }
    }
  }

  private async runOne(testCase: TestCase): Promise<void> {
    const command = new InvokeCommand({
      FunctionName: testCase.fnResourceId,
      LogType: LogType.Tail,
    });

    const response = await this.lambdaClient.send(command);
    if (response.FunctionError) {
      const logs = Buffer.from(response.LogResult ?? "", "base64").toString();
      logger.error(logs);
      throw new Error(response.FunctionError);
    }
  }
}

class SimTesterClient implements TesterClient {
  private readonly description: string;
  private readonly simClient: simulator.SimulatorCleint;

  constructor(description: string, simClient: simulator.SimulatorCleint) {
    this.description = description;
    this.simClient = simClient;
  }

  public async runTests(): Promise<void> {
    logger.info(`+ Test Group: ${this.description}`);
    const testCases = await this.simClient.listTests();
    for (const testCase of testCases) {
      logger.info(`  + Test Case: ${testCase.description}`);
      try {
        await this.simClient.runTest(testCase);
        logger.info(`  ✔️ Passed`);
      } catch (e) {
        if (e instanceof Error) {
          logger.error("  ✖️ Failed, ", e.message);
        } else {
          logger.error("  ✖️ Failed, ", e);
        }
      }
    }
  }
}
