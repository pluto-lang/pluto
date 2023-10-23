import { test, expect } from "vitest";
import { ImportType, extractImportElements } from "./imports";

import ts from "typescript";

function genInlineSourceFile(sourceCode: string): ts.SourceFile {
  const fileName = "inline.ts";
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    }),
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => "0",
    getScriptSnapshot: (name) =>
      name === fileName ? ts.ScriptSnapshot.fromString(sourceCode) : undefined,
    readFile: () => undefined,
    fileExists: () => true,
  };
  const service = ts.createLanguageService(host);

  const program = service.getProgram();
  expect(program).toBeDefined();

  const sourceFile = program!.getSourceFile(fileName);
  expect(sourceFile).toBeDefined();
  return sourceFile!;
}

test("case: direct import", () => {
  const importStat = `import "fs";`;

  const sourceFile = genInlineSourceFile(importStat);
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) {
      return;
    }

    const elements = extractImportElements(sourceFile, node);
    expect(elements.length).toEqual(1);
    expect(elements[0]).toEqual({
      type: ImportType.Direct,
      name: "",
      package: "fs",
    });
  });
});

test("case: named import + default import", () => {
  const importStat = `import element, { another } from "library"`;

  const sourceFile = genInlineSourceFile(importStat);
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) {
      return;
    }

    const elements = extractImportElements(sourceFile, node);
    expect(elements).toHaveLength(2);
    expect(elements[0]).toEqual({
      type: ImportType.Default,
      name: "element",
      package: "library",
    });
  });
});

test("case: namespace import", () => {
  const importStat = `import * as element from "library"`;

  const sourceFile = genInlineSourceFile(importStat);
  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) {
      return;
    }

    const elements = extractImportElements(sourceFile, node);
    expect(elements).toHaveLength(1);
    expect(elements[0]).toEqual({
      type: ImportType.Namespace,
      name: "element",
      package: "library",
    });
  });
});
