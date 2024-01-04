import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}.local` });

import os from "os";
import fse from "fs-extra";
import { test, expect, beforeAll, afterAll } from "vitest";
import {
  PlutoGlobalConfig,
  createPlutoRole,
  getAwsCredentialsFromAuthService,
  getAwsCredentialsFromLocal,
  readPlutoGlobalConfig,
  savePlutoGlobalConfig,
} from "./utils";
import { randomUUID } from "crypto";

const inLocal = process.env.LOCAL === "true";

const credsFilepath = `${os.homedir()}/.aws/credentials`;
const configFilepath = `${os.homedir()}/.aws/config`;
let oldCredentials: Buffer, oldConfig: Buffer, oldPlutoConfig: PlutoGlobalConfig;

// load the original aws credentials and config files before testing begins
beforeAll(() => {
  fse.ensureFileSync(credsFilepath);
  fse.ensureFileSync(configFilepath);
  oldCredentials = fse.readFileSync(credsFilepath);
  oldConfig = fse.readFileSync(configFilepath);
  oldPlutoConfig = readPlutoGlobalConfig();
});

// restore the original aws credentials and config files after testing ends
afterAll(() => {
  fse.writeFileSync(credsFilepath, oldCredentials);
  fse.writeFileSync(configFilepath, oldConfig);
  savePlutoGlobalConfig(oldPlutoConfig);
});

test.todo("create a Pluto Role", async () => {
  const oldPlutoConfig = readPlutoGlobalConfig();
  savePlutoGlobalConfig({});
  const userId = await createPlutoRole().catch((e) => {
    console.error(e);
    return undefined;
  });
  expect(userId).toBeDefined();
  savePlutoGlobalConfig(oldPlutoConfig);
});

test("get credentials from local", async () => {
  fse.writeFileSync(credsFilepath, "");
  fse.writeFileSync(configFilepath, "");
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;
  delete process.env.REGION;
  delete process.env.AWS_PROFILE;

  // Test: file is not empty
  const strs = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const testConfig = `[default]
region = us-east-1
[profile serverless]
region = us-east-1
`;
  const testCreds = `[default]
aws_access_key_id = ${strs[0]}
aws_secret_access_key = ${strs[1]}
[serverless]
aws_access_key_id = ${strs[2]}
aws_secret_access_key = ${strs[3]}
`;
  fse.writeFileSync(credsFilepath, testCreds);
  fse.writeFileSync(configFilepath, testConfig);

  let creds = await getAwsCredentialsFromLocal();
  expect(creds).toBeDefined();
  expect(creds?.accessKeyId).toEqual(strs[0]);
  expect(creds?.secretAccessKey).toEqual(strs[1]);

  process.env.AWS_PROFILE = "serverless";
  creds = await getAwsCredentialsFromLocal();
  expect(creds).toBeDefined();
  expect(creds?.accessKeyId).toEqual(strs[2]);
  expect(creds?.secretAccessKey).toEqual(strs[3]);

  process.env.AWS_ACCESS_KEY_ID = strs[4];
  process.env.AWS_SECRET_ACCESS_KEY = strs[5];
  creds = await getAwsCredentialsFromLocal();
  expect(creds).toBeDefined();
  expect(creds?.accessKeyId).toEqual(strs[4]);
  expect(creds?.secretAccessKey).toEqual(strs[5]);
});

test.runIf(inLocal)("get credentials from auth service", async () => {
  const userId = process.env.USER_ID;
  if (userId == undefined) {
    throw new Error("USER_ID is not defined");
  }
  const creds = await getAwsCredentialsFromAuthService(userId).catch(() => undefined);
  expect(creds).toBeDefined();
});
