import { InlineProgramArgs, LocalWorkspace } from "@pulumi/pulumi/automation";

const pulumiProgram = async () => {
  const outputs = import("./apiGatewayRouter.test");
  return outputs;
};

async function main() {
  const args: InlineProgramArgs = {
    stackName: "dev",
    projectName: "pluto-infra",
    program: pulumiProgram,
  };

  const stack = await LocalWorkspace.createOrSelectStack(args);
  console.info("successfully initialized stack");

  console.info("setting up config");
  await stack.setConfig("aws:region", { value: "us-east-1" });
  console.info("config set");

  console.info("refreshing stack...");
  await stack.refresh({ onOutput: console.info });
  console.info("refresh complete");

  console.info("updating stack...");
  const upRes = await stack.up({ onOutput: console.info });
  console.log(`update summary: \n${JSON.stringify(upRes.summary.resourceChanges, null, 4)}`);
  console.log(`website url: ${upRes.outputs.websiteUrl.value}`);

  console.info("destroying stack...");
  await stack.destroy({ onOutput: console.info });
  console.info("stack destroy complete");
}

main().catch((err) => console.error(err));
