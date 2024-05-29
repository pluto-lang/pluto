import chalk from "chalk";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  FilterLogEventsCommandInput,
  ResourceNotFoundException,
} from "@aws-sdk/client-cloudwatch-logs";
import { PlatformType, ProvisionType, core } from "@plutolang/base";
import logger from "../log";
import { getStackBasicDirs } from "../utils";
import {
  buildAdapterByProvisionType,
  loadArchRef,
  loadProjectAndStack,
  loadProjectRoot,
} from "./utils";

const CHALK_COLOR_FNS = [
  chalk.red,
  chalk.green,
  chalk.yellow,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.white,
  chalk.gray,
  chalk.redBright,
  chalk.greenBright,
  chalk.yellowBright,
  chalk.blueBright,
  chalk.magentaBright,
  chalk.cyanBright,
  chalk.whiteBright,
];

export interface LogOptions {
  stack?: string;
  follow?: boolean;
  all?: boolean;
  showPlatform?: boolean;
}

export async function log(opts: LogOptions) {
  try {
    const projectRoot = loadProjectRoot();
    const { project, stack } = loadProjectAndStack(projectRoot, opts.stack);

    if (stack.provisionType !== ProvisionType.Pulumi || stack.platformType !== PlatformType.AWS) {
      logger.error("Currently, only pulumi stacks on AWS are supported.");
      return;
    }

    if (!stack.archRefFile || !stack.provisionFile) {
      throw new Error(
        "The stack is missing an architecture reference file and a provision file. Please execute the `pluto deploy` command again before proceeding with the log command."
      );
    }

    // Get the deployed resources from Pulumi adapter
    const { stateDir } = getStackBasicDirs(projectRoot, stack.name);
    const adapter = await buildAdapterByProvisionType(stack.provisionType, {
      project: project.name,
      rootpath: project.rootpath,
      language: project.language,
      stack: stack,
      archRef: loadArchRef(stack.archRefFile),
      entrypoint: stack.provisionFile,
      stateDir: stateDir,
    });
    const result = await adapter.state();
    await viewLogForAWS(result.instances, opts);
  } catch (e) {
    if (e instanceof Error) {
      logger.error("Failed to view the log: ", e.message);
    } else {
      logger.error("Failed to view the log: ", e);
    }
    logger.debug(e);
    process.exit(1);
  }
}

/**
 * View the logs for the AWS stack
 * @param resources The deployed resources in the stack
 * @param options The options for the log command
 */
async function viewLogForAWS(resources: core.ResourceInstance[], options?: LogOptions) {
  // Get the names of the Lambda functions, and then print their logs
  const AWS_LAMBDA_TYPE_IN_PULUMI = "aws:lambda/function:Function";
  const promises = resources
    .filter((ins) => ins.type === AWS_LAMBDA_TYPE_IN_PULUMI)
    .map((lambda, idx) => {
      const name = lambda.name;
      return viewLogOfLambda(name, idx);
    });
  if (promises.length === 0) {
    logger.warn("No functions found in the stack");
  }
  await Promise.all(promises);

  async function viewLogOfLambda(lambdaName: string, idx: number) {
    logger.info("View the logs for Lambda function: ", lambdaName);

    const client = new CloudWatchLogsClient();
    const logGroupName = `/aws/lambda/${lambdaName}`;
    const colorFn = CHALK_COLOR_FNS[idx % CHALK_COLOR_FNS.length];

    // Get logs within the last 5 minutes if  not all logs are requested
    const startTime = options?.all ? 0 : new Date().getTime() - 5 * 60 * 1000;
    let nextToken: string | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const params: FilterLogEventsCommandInput = {
          logGroupName,
          startTime,
          nextToken,
        };
        const command = new FilterLogEventsCommand(params);
        const response = await client.send(command);

        response.events?.forEach((event) => {
          if (!options?.showPlatform && isPlatformLog(event.message ?? "")) {
            // If the log message is a platform log, and the user does not want to show them, skip
            // it
            return;
          }

          const formattedTime = new Date(event.timestamp!).toISOString();
          console.log(`${colorFn(lambdaName)} | ${formattedTime} | ${event.message?.trim()}`);
        });

        // Update the token for the next iteration
        nextToken = response.nextToken ?? nextToken;
      } catch (e) {
        if (e instanceof ResourceNotFoundException) {
          logger.debug(`No logs found for Lambda function: ${lambdaName}`);
        } else {
          throw e;
        }
      }

      if (!options?.follow) {
        // If not following, exit the loop
        break;
      } else {
        // Wait for 500 milliseconds before fetching the next batch of logs
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  function isPlatformLog(logMessage: string) {
    if (
      /^INIT_START|^START RequestId|^END RequestId|^INIT_REPORT|^REPORT RequestId/g.test(logMessage)
    ) {
      return true;
    }
    return false;
  }
}
