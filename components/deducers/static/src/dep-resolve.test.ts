import ts from "typescript";
import { expect, describe, test } from "vitest";
import { genAnalyzerForInline } from "./utils-test";
import { ImportStore, extractImportElements } from "./imports";
import { resolveImportDeps } from "./dep-resolve";

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

describe.concurrent("named import cases", async () => {
  const importStat = `import { foo } from "lib";`;
  const cases = [
    "foo.access();",
    "foo.prop;",
    "new foo();",
    "new foo.Cls();",
    "const obj: foo = new foo();",
    "const obj: foo.Cls = new foo.Cls();",
    "(a: number): Promise<foo> => { }",
    "(a: number): Promise<foo.Cls> => { }",
  ];

  for (const kacse of cases) {
    const code = importStat + kacse;
    test.concurrent(kacse, async () => testOnce(code, 1, 1));
  }
});

describe.concurrent("namespace import cases", async () => {
  const importStat = `import foo from "lib";`;
  const cases = [
    "foo.access();",
    "foo.prop;",
    "new foo();",
    "new foo.Cls();",
    "const obj: foo = new foo();",
    "const obj: foo.Cls = new foo.Cls();",
    "(a: number): Promise<foo> => { }",
    "(a: number): Promise<foo.Cls> => { }",
  ];

  for (const kacse of cases) {
    const code = importStat + kacse;
    test.concurrent(kacse, async () => testOnce(code, 1, 1));
  }
});
