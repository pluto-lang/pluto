import fs from "fs";
import path from "path";
import { InvokeCommand, LambdaClient, LogType } from "@aws-sdk/client-lambda";
import { arch, config, core, ProvisionType, PlatformType, simulator } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { TestCase } from "@plutolang/pluto";
import { PLUTO_PROJECT_OUTPUT_DIR, isPlutoProject, loadProject } from "../utils";
import logger from "../log";
import { loadAndDeduce, loadAndGenerate } from "./compile";
import { buildAdapter, selectAdapterByEngine } from "./utils";

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

  const projectRoot = path.resolve("./");
  if (!isPlutoProject(projectRoot)) {
    logger.error("The current location is not located at the root of a Pluto project.");
    process.exit(1);
  }
  const proj = loadProject(projectRoot);
  process.env["PLUTO_PROJECT_NAME"] = proj.name;

  const stackName = opts.stack ?? proj.current;
  if (!stackName) {
    logger.error(
      "There isn't a default stack. Please use the --stack option to specify which stack you want."
    );
    process.exit(1);
  }

  let stack = proj.getStack(stackName);
  if (!stack) {
    logger.error(`There is no stack named ${stackName}.`);
    process.exit(1);
  }
  process.env["PLUTO_STACK_NAME"] = stack.name;

  // If in simulation mode, switch the platform and provisioning engine of the stack to simulator.
  if (opts.sim) {
    stack = new config.Stack(stack.name, PlatformType.Simulator, ProvisionType.Simulator);
  }

  const basicArgs: core.BasicArgs = {
    project: proj.name,
    stack: stack,
    rootpath: path.resolve("."),
  };
  const stackBaseDir = path.join(projectRoot, PLUTO_PROJECT_OUTPUT_DIR, stackName);
  const closureBaseDir = path.join(stackBaseDir, "closures");

  // construct the arch ref from user code
  logger.info("Generating reference architecture...");
  const { archRef } = await loadAndDeduce(
    opts.deducer,
    {
      ...basicArgs,
      closureDir: closureBaseDir,
    },
    [entrypoint]
  );

  const testGroupArchs = splitTestGroup(archRef);
  for (let testGroupIdx = 0; testGroupIdx < testGroupArchs.length; testGroupIdx++) {
    await testOneGroup(testGroupIdx, testGroupArchs[testGroupIdx], proj, stack, opts);
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
  const testId = `test-${testGroupIdx}`;

  const basicArgs: core.BasicArgs = {
    project: project.name,
    rootpath: project.rootpath,
    stack: stack,
  };
  const generatedDir = path.join(
    project.rootpath,
    PLUTO_PROJECT_OUTPUT_DIR,
    stack.name,
    testId,
    "generated"
  );

  // generate the IR code based on the arch ref
  logger.info("Generating the IaC Code and computing modules...");
  const generateResult = await loadAndGenerate(
    opts.generator,
    basicArgs,
    testGroupArch,
    generatedDir
  );

  // build the adapter based on the provisioning engine type
  const adapterPkg = selectAdapterByEngine(stack.provisionType);
  if (!adapterPkg) {
    logger.error(`There is no adapter for type ${stack.provisionType}.`);
    process.exit(1);
  }
  const adapter = await buildAdapter(adapterPkg, {
    ...basicArgs,
    archRef: testGroupArch,
    entrypoint: generateResult.entrypoint!,
    workdir: generatedDir,
  });

  const tmpSta = new config.Stack(
    `${stack.name}-${testId}`,
    stack.platformType,
    stack.provisionType
  );
  try {
    logger.info("Applying...");
    const applyResult = await adapter.deploy();
    tmpSta.setDeployed();
    logger.info("Successfully applied!");

    if (stack.platformType == PlatformType.Simulator) {
      const simServerUrl = applyResult.outputs!["simulatorServerUrl"];
      for (const resourceName in testGroupArch.resources) {
        const resource = testGroupArch.resources[resourceName];
        // TODO: support other types of tester from other packages.
        if (resource.type !== "@plutolang/pluto.Tester") {
          continue;
        }

        const description = eval(resource.parameters.find((p) => p.index === 0)!.value);
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
        const testerClient = buildTesterClient(tmpSta, tester);
        await testerClient.runTests();
      }
    }

    logger.info("Destroying...");
    await adapter.destroy();
    tmpSta.setUndeployed();
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
        if (e instanceof Error) {
          logger.error("  ✖️ Failed, ", e.message);
        } else {
          logger.error("  ✖️ Failed, ", e);
        }
      }
    }
  }
}
