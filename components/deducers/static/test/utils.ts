import { randomUUID } from "crypto";
import * as os from "os";
import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";
import { expect } from "vitest";

interface SourceFileWithChecker {
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
}

const tsOpts: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
};

const moduleResolutionHost: ts.ModuleResolutionHost = {
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
};

// For testing purposes, the task is to generate a TypeScript `ts.SourceFile` from an inline code.
export function genAnalyzerForInline(sourceCode: string): SourceFileWithChecker {
  const fileName = "inline.ts";
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => tsOpts,
    ...moduleResolutionHost,
    useCaseSensitiveFileNames: () => true,
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => "0",
    getScriptSnapshot: (name) =>
      name === fileName ? ts.ScriptSnapshot.fromString(sourceCode) : undefined,
    resolveModuleNameLiterals: (
      moduleLiterals: readonly ts.StringLiteralLike[],
      containingFile: string,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions
    ) => {
      return moduleLiterals.map((moduleLiteral) =>
        resolveModule(moduleLiteral.text, containingFile, options, redirectedReference)
      );
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

export function genAnalyzerForFile(filename: string, content: string): SourceFileWithChecker {
  const basedir = path.join(os.tmpdir(), "pluto-test-" + randomUUID());
  fs.ensureDirSync(basedir);

  const filepath = path.join(basedir, filename);
  fs.writeFileSync(filepath, content);

  return genAnalyzerForFixture(filepath);
}

export function rmSourceFile(sourceFile: ts.SourceFile) {
  fs.rmSync(sourceFile.fileName);
}

export function genAnalyzerForFixture(filepath: string): SourceFileWithChecker {
  const host: ts.CompilerHost = {
    ...ts.createCompilerHost(tsOpts),
    ...moduleResolutionHost,
    useCaseSensitiveFileNames: () => true,
    resolveModuleNameLiterals: (
      moduleLiterals: readonly ts.StringLiteralLike[],
      containingFile: string,
      redirectedReference: ts.ResolvedProjectReference | undefined,
      options: ts.CompilerOptions
    ): readonly ts.ResolvedModuleWithFailedLookupLocations[] => {
      return moduleLiterals.map((moduleLiteral) =>
        resolveModule(moduleLiteral.text, containingFile, options, redirectedReference)
      );
    },
  };

  const program = ts.createProgram([filepath], tsOpts, host);
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

function resolveModule(
  pkgName: string,
  containingFile: string,
  options: ts.CompilerOptions,
  redirectedReference?: ts.ResolvedProjectReference
) {
  // Search for the target package within the current project directory.
  const nodeModulesPath = path.resolve(__dirname, "../node_modules");
  const pkgPath = path.resolve(nodeModulesPath, pkgName);
  const result = ts.resolveModuleName(
    pkgPath,
    containingFile,
    options,
    ts.sys,
    undefined,
    redirectedReference
  );
  if (result.resolvedModule != undefined) {
    return result;
  }

  // If it's not found there, look for it in the default path.
  return ts.resolveModuleName(
    pkgName,
    containingFile,
    options,
    ts.sys,
    undefined,
    redirectedReference
  );
}
