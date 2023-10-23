import { describe, test, expect } from "vitest";
import { engine, project } from "@plutolang/base";
import { genPulumiConfigForAWS } from "./utils";

// TODO: Enable testing in CI and other environments.
describe.skip("test get aws config", () => {
  test.concurrent("get non-default profile", async () => {
    const awsRt = new project.AwsRuntime();
    const sta = new project.Stack("stackName", awsRt, engine.Type.pulumi);

    process.env["AWS_PROFILE"] = "dev";
    const creds = await genPulumiConfigForAWS(sta);
    expect(creds).toBeDefined();
  });

  test.concurrent("get invalid profile", async () => {
    const awsRt = new project.AwsRuntime();
    const sta = new project.Stack("stackName", awsRt, engine.Type.pulumi);

    process.env["AWS_PROFILE"] = "dev1";
    expect(async () => {
      await genPulumiConfigForAWS(sta);
    }).rejects.toThrowError();
  });
});
