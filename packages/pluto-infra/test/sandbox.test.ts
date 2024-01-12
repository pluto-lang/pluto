import * as fs from "fs";
import * as path from "path";
import { test, expect } from "vitest";
import { Sandbox } from "../src/utils/sandbox";

const code = `
module.exports = {
    default: async () => { await main(); },
};

var main = async () => {
    if (!process.env.ENV_VAR) throw new Error("ENV_VAR doesn't exist");
};
`;

test("run code", async () => {
  const dirpath = fs.mkdtempSync("pluto-test-");
  const codeFilepath = path.resolve(dirpath, "main.js");
  fs.writeFileSync(codeFilepath, code);

  const sb = new Sandbox(codeFilepath, {
    env: {
      ENV_VAR: "FOO",
    },
  });
  expect(async () => await sb.call("")).not.toThrow();

  fs.rmSync(dirpath, { recursive: true });
});
