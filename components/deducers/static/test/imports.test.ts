import * as ts from "typescript";
import { test, expect } from "vitest";
import { ImportType, extractImportElements } from "../src/imports";
import { genAnalyzerForInline } from "./utils";

test("case: direct import", () => {
  const importStat = `import "fs";`;

  const { sourceFile } = genAnalyzerForInline(importStat);
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

  const { sourceFile } = genAnalyzerForInline(importStat);
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

  const { sourceFile } = genAnalyzerForInline(importStat);
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
