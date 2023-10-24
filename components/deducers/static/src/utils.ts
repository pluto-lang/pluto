import ts from "typescript";
import { expect } from "vitest";

export function isPrimitive(val: any): boolean {
  const primitiveTypes = [
    "string",
    "number",
    "boolean",
    "undefined",
    "symbol",
    "bigint",
    "void",
    "any",
    "unknown",
  ];
  return primitiveTypes.indexOf(val) !== -1;
}

// For testing purposes, the task is to generate a TypeScript `ts.SourceFile` from an inline code.
export function genInlineSourceFile(sourceCode: string): ts.SourceFile {
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
