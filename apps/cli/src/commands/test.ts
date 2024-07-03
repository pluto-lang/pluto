import fs from "fs";
import assert from "assert";
import { InvokeCommand, LambdaClient, LogType } from "@aws-sdk/client-lambda";
import { arch, config, core, ProvisionType, PlatformType, simulator } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { TestCase } from "@plutolang/pluto";
import { dumpStackState, getStackBasicDirs, prepareStackDirs } from "../utils";
import logger from "../log";
import { loadAndDeduce, loadAndGenerate } from "./compile";
import {
  buildAdapterByProvisionType,
  getDefaultDeducerPkg,
  getDefaultEntrypoint,
  loadProjectAndStack,
  loadProjectRoot,
  stackStateFile,
} from "./utils";
import { loadDotEnvs } from "./env";

interface TestOptions {
  sim: boolean;
  stack?: string;
  deducer?: string;
  generator: string;
}

export async function test(entrypoint: string, opts: TestOptions) {
  try {
    const projectRoot = loadProjectRoot();
    const { project, stack: originalStack } = loadProjectAndStack(projectRoot);
    let stack = originalStack;

    // Load the environment variables from the `.env` files.
    loadDotEnvs(projectRoot, stack.name, false);

    // Ensure the entrypoint exist.
    entrypoint = entrypoint ?? getDefaultEntrypoint(project.language);
    if (!fs.existsSync(entrypoint)) {
      throw new Error(`No such file, ${entrypoint}`);
    }

    // If in simulation mode, switch the platform and provisioning engine of the stack to simulator.
    if (opts.sim) {
      stack = new config.Stack(stack.name, PlatformType.Simulator, ProvisionType.Simulator);
    }

    const { closuresDir } = getStackBasicDirs(projectRoot, stack.name);

    // construct the arch ref from user code
    logger.info("Generating reference architecture...");
    const { archRef } = await loadAndDeduce(
      getDefaultDeducerPkg(project.language, opts.deducer),
      {
        project: project.name,
        stack: stack,
        rootpath: projectRoot,
        closureDir: closuresDir,
      },
      [entrypoint]
    );

    const testGroupArchs = splitTestGroup(archRef);
    for (let testGroupIdx = 0; testGroupIdx < testGroupArchs.length; testGroupIdx++) {
      await testOneGroup(testGroupIdx, testGroupArchs[testGroupIdx], project, stack, opts);
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(e.message);
      if (process.env.DEBUG) {
        logger.error(e.stack);
      }
    } else {
      logger.error(e);
    }
    process.exit(1);
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
  project: config.Project,
  stack: config.Stack,
  opts: TestOptions
) {
  const testId = `test.${testGroupIdx}`;

  const testStack = new config.Stack(
    `${stack.name}.${testId}`,
    stack.platformType,
    stack.provisionType
  );

  let exitCode = 0;
  let adapter: core.Adapter | undefined;
  try {
    // Prepare the directories for the stack.
    const { generatedDir, stateDir } = await prepareStackDirs(project.rootpath, testStack.name);

    const basicArgs: core.BasicArgs = {
      project: project.name,
      rootpath: project.rootpath,
      // TODO: Should be testStack. But, currently, the simulator adapter deploys the stack based on
      // the arch ref generated from the original stack.
      stack: stack,
    };

    // generate the IR code based on the arch ref
    logger.info("Generating the IaC Code and computing modules...");
    const generateResult = await loadAndGenerate(
      opts.generator,
      {
        ...basicArgs,
        language: project.language,
      },
      testGroupArch,
      generatedDir
    );

    adapter = await buildAdapterByProvisionType(stack.provisionType, {
      ...basicArgs,
      language: project.language,
      archRef: testGroupArch,
      entrypoint: generateResult.entrypoint!,
      stateDir: stateDir,
    });

    logger.info("Applying...");
    const applyResult = await adapter.deploy();
    testStack.setDeployed();
    dumpStackState(stackStateFile(stateDir), stack.state);
    logger.info("Successfully applied!");

    if (stack.platformType == PlatformType.Simulator) {
      const simServerUrl = applyResult.outputs!["simulatorServerUrl"];
      for (const resourceName in testGroupArch.resources) {
        const resource = testGroupArch.resources[resourceName];
        // TODO: support other types of tester from other packages.
        if (resource.type !== "@plutolang/pluto.Tester") {
          continue;
        }

        const descriptionArg = resource.arguments.find((p) => p.index === 0);
        assert(descriptionArg?.type === "text");
        const description = eval(descriptionArg.value);
        if (description == undefined) {
          throw new Error(`The description of ${resourceName} is not found.`);
        }

        const testId = genResourceId("@plutolang/pluto.Tester", description);
        const simClient = simulator.makeSimulatorClient(simServerUrl, testId);
        const testerClient = new SimTesterClient(description, simClient);

        await testerClient.runTests();
      }
    } else {
      const testers = listAllTester(applyResult.outputs!);
      if (testers.length === 0) {
        console.warn("Not found any testers.");
        if (process.env.DEBUG) {
          console.log("The resource of deployment: ", JSON.stringify(applyResult, undefined, 2));
        }
      }
      for (const tester of testers) {
        const testerClient = buildTesterClient(testStack, tester);
        await testerClient.runTests();
      }
    }
  } catch (e) {
    exitCode = 1;
    if (e instanceof Error) {
      logger.error(e.message);
      if (process.env.DEBUG) {
        logger.error(e.stack);
      }
    } else {
      logger.error(e);
    }
  } finally {
    if (adapter) {
      const { stateDir } = getStackBasicDirs(project.rootpath, testStack.name);

      logger.info("Destroying...");
      await adapter.destroy();
      testStack.setUndeployed();
      dumpStackState(stackStateFile(stateDir), stack.state);
      logger.info("Successfully destroyed!");
    }
  }
  process.exit(exitCode);
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

function buildTesterClient(sta: config.Stack, tester: Tester): TesterClient {
  switch (sta.platformType) {
    case PlatformType.AWS:
      return new AwsTesterClient(tester);
    case PlatformType.K8s:
    case PlatformType.Azure:
    case PlatformType.GCP:
    case PlatformType.AliCloud:
    case PlatformType.Simulator:
    case PlatformType.Custom:
      throw new Error("Not implemented yet.");
    default:
      throw new Error(`Unknown runtime type, ${sta.platformType}`);
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
        logger.error("  ✖️ Failed, ", e);
      }
    }
  }

  private async runOne(testCase: TestCase): Promise<void> {
    const command = new InvokeCommand({
      FunctionName: testCase.testHandler,
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
        logger.error("  ✖️ Failed, ", e);
      }
    }
  }
}
