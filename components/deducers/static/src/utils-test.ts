import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import ts from "typescript";
import { expect } from "vitest";

interface SourceFileWithChecker {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
}

// For testing purposes, the task is to generate a TypeScript `ts.SourceFile` from an inline code.
export function genAnalyzerForInline(sourceCode: string): SourceFileWithChecker {
  const fileName = "inline.ts";
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
    }),
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => "0",
    getScriptSnapshot: (name) =>
      name === fileName ? ts.ScriptSnapshot.fromString(sourceCode) : undefined,
    readFile: ts.sys.readFile,
    fileExists: ts.sys.fileExists,
    resolveModuleNameLiterals: (
      moduleLiterals: readonly ts.StringLiteralLike[],
      containingFile: string,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions,
      containingSourceFile: ts.SourceFile,
      reusedNames: readonly ts.StringLiteralLike[] | undefined
    ) => {
      return moduleLiterals.map((moduleLiteral) => {
        const result = ts.resolveModuleName(
          moduleLiteral.text,
          containingFile,
          options,
          ts.sys,
          undefined,
          redirectedReference
        );
        console.log(result);
        return result;
      });
    },
  };

  const service = ts.createLanguageService(host);

  const program = service.getProgram();
  expect(program).toBeDefined();

  const allDiagnostics = ts.getPreEmitDiagnostics(program!);
  // Emit errors
  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      );
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });

  const sourceFile = program!.getSourceFile(fileName);
  expect(sourceFile).toBeDefined();
  return {
    sourceFile: sourceFile!,
    checker: program!.getTypeChecker(),
  };
}

export function genAnalyzerForFile(content: string): SourceFileWithChecker {
  const filename = "testtmp-" + randomUUID() + ".ts";
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, content);

  const tsconfigPath = path.resolve("./", "tsconfig.json");
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const configJson = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./");
  // return await compilePluto(filepaths, configJson.options);
  const program = ts.createProgram([filepath], configJson.options);

  const sourceFile = program.getSourceFile(filepath)!;
  const checker = program.getTypeChecker();
  return { sourceFile, checker };
}

export function rmSourceFile(sourceFile: ts.SourceFile) {
  fs.rmSync(sourceFile.fileName);
}

export function genAnalyzerForFixture(filepath: string): SourceFileWithChecker {
  const tsOpts = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
  };

  const program = ts.createProgram([filepath], tsOpts);
  const allDiagnostics = ts.getPreEmitDiagnostics(program);
  // Emit errors
  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      );
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });

  const sourceFile = program.getSourceFile(filepath)!;
  expect(sourceFile).toBeDefined();

  const checker = program.getTypeChecker();
  expect(checker).toBeDefined();

  return {
    sourceFile,
    checker,
  };
}
