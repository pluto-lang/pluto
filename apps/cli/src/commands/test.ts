import path from "path";
import { InvokeCommand, LambdaClient, LogType } from "@aws-sdk/client-lambda";
import { arch, project, runtime } from "@plutolang/base";
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

export async function test(files: string[], opts: TestOptions) {
  // If the user only privides one file, change the variable to an array.
  if (typeof files === "string") {
    files = [files];
  }

  // If the user only privides one file, change the variable to an array.
  if (typeof files === "string") {
    files = [files];
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

  // construct the arch ref from user code
  logger.info("Generating reference architecture...");
  const archRef = await loadAndDeduce(opts.deducer, files);

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

  // generate the IR code based on the arch ref
  logger.info("Generating the IaC Code and computing modules...");
  const outdir = path.join(".pluto", sta.name, testId);
  const entrypointFile = await loadAndGenerate(opts.generator, testGroupArch, outdir);
  if (process.env.DEBUG) {
    logger.debug("Entrypoint file: ", entrypointFile);
  }

  // build the adapter based on the engine type
  const adpt = BuildAdapterByEngine(sta.engine);
  if (!adpt) {
    logger.error("No such engine.");
    process.exit(1);
  }

  const tmpSta = new project.Stack(`${sta.name}-${testId}`, sta.runtime, sta.engine);

  logger.info("Applying...");
  const applyResult = await adpt.apply({
    projName: proj.name,
    stack: tmpSta,
    entrypoint: entrypointFile,
  });
  if (applyResult.error) {
    logger.error(applyResult.error);
    process.exit(1);
  }

  const testers = listAllTester(applyResult.outputs!);
  for (const tester of testers) {
    const testerClient = buildTesterClient(tmpSta, tester);
    await testerClient.runTests();
  }

  const destroyResult = await adpt.destroy({
    projName: proj.name,
    stack: tmpSta,
  });
  if (destroyResult.error) {
    logger.error(destroyResult.error);
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
