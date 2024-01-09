import path from "path";
import ts from "typescript";
import { test, expect } from "vitest";
import {
  methodBelongsToClientApi,
  methodBelongsToInfraApi,
  propBelongsToCapturedProps,
} from "../src/utils";
import { genAnalyzerForFixture } from "../src/utils-test";

const baseDir = path.join(__dirname, "fixtures");

test.concurrent("method should belong to client api", () => {
  const codeFile = path.join(baseDir, "client-api/valid.ts");
  const { sourceFile, checker } = genAnalyzerForFixture(codeFile);

  let caseCount = 0;
  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression)) {
      return;
    }
    caseCount++;

    const belongsToTargetIface = methodBelongsToClientApi(node.expression, checker);
    expect(belongsToTargetIface).toEqual(true);
  });
  expect(caseCount).toBeGreaterThan(0);
});

test.concurrent("method should belong to infra api", () => {
  const codeFile = path.join(baseDir, "infra-api/valid.ts");
  const { sourceFile, checker } = genAnalyzerForFixture(codeFile);

  let caseCount = 0;
  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression)) {
      return;
    }
    caseCount++;

    const belongsToTargetIface = methodBelongsToInfraApi(node.expression, checker);
    expect(belongsToTargetIface).toEqual(true);
  });
  expect(caseCount).toBeGreaterThan(0);
});

test.concurrent("property should belong to captured props", () => {
  const codeFile = path.join(baseDir, "captured-props/valid.ts");
  const { sourceFile, checker } = genAnalyzerForFixture(codeFile);

  let caseCount = 0;
  ts.forEachChild(sourceFile, (node: ts.Node) => {
    if (!ts.isExpressionStatement(node) || !ts.isPropertyAccessExpression(node.expression)) {
      return;
    }
    caseCount++;

    const belongsToTargetIface = propBelongsToCapturedProps(node.expression, checker);
    expect(belongsToTargetIface).toEqual(true);
  });
  expect(caseCount).toBeGreaterThan(0);
});
