import { resolve } from "path";
import { testPulumiProgram } from "../utils";

function pulumiProgram(filepath: string) {
  return async () => {
    const absolutePath = resolve(__dirname, filepath);
    return await import(absolutePath);
  };
}

testPulumiProgram("kvstore on aws: dynamodb", pulumiProgram("./dynamodb"));
testPulumiProgram("queue on aws: sns", pulumiProgram("./sns"));
