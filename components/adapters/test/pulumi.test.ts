import path from "path";
import { test } from "vitest";
import { engine, project } from "@plutolang/base";
import { PulumiAdapter } from "../src/pulumi";

const projectName = "pulumi-test";
const awsRt: project.AwsRuntime = new project.AwsRuntime();
const stack: project.Stack = new project.Stack("dev", awsRt, engine.Type.pulumi);

test.skip("pulumi-test", async () => {
  const entrypoint = path.join(__dirname, "./pulumi-case");
  const pulumiAdapter = new PulumiAdapter();
  pulumiAdapter.apply({ entrypoint: entrypoint, projName: projectName, stack: stack });
  // TODO: add test case
});
