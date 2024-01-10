import * as ts from "typescript";
import { expect, describe, test } from "vitest";
import { genAnalyzerForInline } from "./utils";
import { ImportStore, extractImportElements } from "../src/imports";
import { resolveImportDeps } from "../src/dep-resolve";

function testOnce(code: string, importStatNum: number, expectDepNum: number) {
  const { sourceFile } = genAnalyzerForInline(code);

  // Parse the import statements, and build the import store
  const importStore = new ImportStore();
  let elemCount = 0;
  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) {
      return;
    }
    const importElems = extractImportElements(sourceFile, node);
    importStore.update(importElems);
    elemCount += importElems.length;
  });
  expect(elemCount).toBe(importStatNum);

  // Resolve the dependencies
  const depImportElems = resolveImportDeps(sourceFile, importStore, sourceFile);
  expect(depImportElems).toHaveLength(expectDepNum);
}

interface TestCase {
  code: string;
  importStatNum: number;
  expectDepNum: number;
}

describe.concurrent("named import cases", async () => {
  const importStat = `import { foo } from "lib";`;
  const cases: TestCase[] = [
    { code: "foo.access();", importStatNum: 1, expectDepNum: 1 },
    { code: "foo.prop;", importStatNum: 1, expectDepNum: 1 },
    { code: "new foo();", importStatNum: 1, expectDepNum: 1 },
    { code: "new foo.Cls();", importStatNum: 1, expectDepNum: 1 },
    { code: "const obj: foo = new foo();", importStatNum: 1, expectDepNum: 1 },
    { code: "const obj: foo.Cls = new foo.Cls();", importStatNum: 1, expectDepNum: 1 },
    { code: "(a: number): Promise<foo> => { }", importStatNum: 1, expectDepNum: 1 },
    { code: "(a: number): Promise<foo.Cls> => { }", importStatNum: 1, expectDepNum: 1 },
  ];

  for (const kase of cases) {
    const code = importStat + kase.code;
    test.concurrent(kase.code, async () => testOnce(code, kase.importStatNum, kase.expectDepNum));
  }
});

describe.concurrent("namespace import cases", async () => {
  const importStat = `import foo from "lib";`;
  const cases: TestCase[] = [
    { code: "foo.access();", importStatNum: 1, expectDepNum: 1 },
    { code: "foo.prop;", importStatNum: 1, expectDepNum: 1 },
    { code: "new foo();", importStatNum: 1, expectDepNum: 1 },
    { code: "new foo.Cls();", importStatNum: 1, expectDepNum: 1 },
    { code: "const obj: foo = new foo();", importStatNum: 1, expectDepNum: 1 },
    { code: "const obj: foo.Cls = new foo.Cls();", importStatNum: 1, expectDepNum: 1 },
    { code: "const obj: foo.bar.Cls = new foo.bar.Cls();", importStatNum: 1, expectDepNum: 1 },
    { code: "(a: number): Promise<foo> => { }", importStatNum: 1, expectDepNum: 1 },
    { code: "(a: number): Promise<foo.Cls> => { }", importStatNum: 1, expectDepNum: 1 },
    { code: "const obj: any[] = [];", importStatNum: 1, expectDepNum: 0 },
  ];

  for (const kase of cases) {
    const code = importStat + kase.code;
    test.concurrent(kase.code, async () => testOnce(code, kase.importStatNum, kase.expectDepNum));
  }
});
