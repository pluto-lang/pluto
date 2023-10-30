import { describe, test, expect } from "vitest";
import { genPulumiConfigForAWS } from "./utils";

// TODO: Enable testing in CI and other environments.
describe.skip("test get aws config", () => {
  test.concurrent("get non-default profile", async () => {
    process.env["AWS_PROFILE"] = "dev";
    const creds = await genPulumiConfigForAWS();
    expect(creds).toBeDefined();
  });

  test.concurrent("get invalid profile", async () => {
    process.env["AWS_PROFILE"] = "dev1";
    expect(async () => {
      await genPulumiConfigForAWS();
    }).rejects.toThrowError();
  });
});
