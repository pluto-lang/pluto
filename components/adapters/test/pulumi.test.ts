import path from "path";
import { test } from "vitest";
import { engine, project } from "@pluto/base";
import { PulumiAdapter } from "../src/pulumi";

const projectName = "pulumi-test";
const awsRt: project.AwsRuntime = new project.AwsRuntime();
const stack: project.Stack = new project.Stack("dev", awsRt, engine.Type.pulumi);

const entrypoint = path.join(__dirname, "./pulumi-case");

const pulumiAdapter = new PulumiAdapter();

pulumiAdapter.apply({ entrypoint: entrypoint, projName: projectName, stack: stack });

test("pulumi-test", async () => {
  // add test case
});
