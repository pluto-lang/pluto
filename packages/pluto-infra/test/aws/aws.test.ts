import { resolve } from "path";
import { testPulumiProgram } from "../utils";

function pulumiProgram(filepath: string) {
  return async () => {
    const absolutePath = resolve(__dirname, filepath);
    return await import(absolutePath);
  };
}

console.warn(process.env.AWS_ACCESS_KEY_ID);
console.warn(process.env.AWS_SECRET_ACCESS_KEY);

testPulumiProgram("kvstore on aws: dynamodb", pulumiProgram("./dynamodb"));
testPulumiProgram("queue on aws: sns", pulumiProgram("./sns"));
