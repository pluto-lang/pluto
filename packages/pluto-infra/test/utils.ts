import os from "os";
import path from "path";
import * as fs from "fs-extra";
import { describe, test, expect, beforeAll, afterAll } from "vitest";

import { LocalWorkspace, Stack } from "@pulumi/pulumi/automation";

export function testPulumiProgram(caseName: string, program: () => Promise<any>) {
  const inCI = process.env.CI ? true : false;
  const inRelease = process.env.RELEASE ? true : false;

  describe.skipIf(inCI && !inRelease)(`test ${caseName}`, async () => {
    // Prepare the test envirionment, and create the Pulumi stack.
    let stack: Stack | undefined = undefined;
    beforeAll(
      async () => {
        // Prepare the test environment, including create the temporary directory,
        // and set the environment variables.
        const projectName = "pluto-infra-test";
        const stackName = "dev";

        const projectRoot = path.join(os.tmpdir(), projectName);
        fs.ensureDirSync(projectRoot);
        const workdir = projectRoot;

        const envs = {
          AWS_REGION: "us-east-1",
          WORK_DIR: workdir,
          PULUMI_CONFIG_PASSPHRASE: "pluto-test-temp",
          PLUTO_PROJECT_NAME: projectName,
          PLUTO_STACK_NAME: stackName,
        };
        for (const key of Object.keys(envs)) {
          process.env[key] = envs[key];
        }

        // Create the Pulumi stack.
        stack = await LocalWorkspace.createOrSelectStack(
          {
            stackName: stackName,
            workDir: workdir,
          },
          {
            workDir: workdir,
            envVars: envs,
            program: program, // The program is set as the file that needs to be tested.
            projectSettings: {
              runtime: "nodejs",
              name: projectName,
              backend: { url: "file://" + projectRoot },
            },
          }
        );
        await stack.setConfig("aws:region", { value: "us-east-1" });
      },
      /* timeout */ 10 * 60 * 1000
    );

    test(
      "apply",
      async () => {
        if (stack == undefined) {
          throw new Error("stack is undefined.");
        }

        await stack.cancel();
        const result = await stack.up();

        const outputs = result.outputs;
        for (const key of Object.keys(outputs)) {
          const value = outputs[key].value;
          expect(value).toBeDefined();
        }
      },
      { timeout: 10 * 60 * 1000 }
    );

    // Clean up the test environment after the test is done.
    afterAll(
      async () => {
        if (stack == undefined) {
          throw new Error("stack is undefined.");
        }

        await stack.destroy();
      },
      /* timeout */ 10 * 60 * 1000
    );
  });
}
