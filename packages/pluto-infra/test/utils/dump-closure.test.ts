import path from "path";
import fs from "fs-extra";
import { globSync } from "glob";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { dumpClosureToDir } from "../../src/utils/dump-closure";
import { createClosure, wrapClosure } from "@plutolang/base/closure";
import { LanguageType } from "@plutolang/base";

const TS_FIXTURES_DIR = path.resolve(__dirname, "../fixtures/closures/typescript");
const PY_FIXTURES_DIR = path.resolve(__dirname, "../fixtures/closures/python");

const fixturesDir = (language: LanguageType) =>
  language === LanguageType.TypeScript ? TS_FIXTURES_DIR : PY_FIXTURES_DIR;
const fileSuffix = (language: LanguageType) =>
  language === LanguageType.TypeScript ? ".js" : ".py";

const importPrefix = (language: LanguageType, placeholder: string) =>
  language === LanguageType.TypeScript ? `var ${placeholder} = async` : `def ${placeholder}`;

let basedir: string;
beforeAll(() => {
  basedir = fs.mkdtempSync("pluto-infra-test-dump-closure-to-dir-ts-");
});

afterAll(() => {
  fs.removeSync(basedir);
});

describe("dump simple closure", () => {
  function testfn(lang: LanguageType) {
    const bizClosure = createClosure(() => {}, {
      dirpath: path.join(fixturesDir(lang), "biz-closure" + fileSuffix(lang)),
      exportName: "handler",
    });

    const outdir = path.join(basedir, "simple-closure" + fileSuffix(lang));
    fs.ensureDirSync(outdir);

    const entrypoint = dumpClosureToDir(outdir, bizClosure, lang);

    const files = globSync(`${outdir}/**/*`);
    expect(files).toHaveLength(1);

    const original = fs.readFileSync(bizClosure.dirpath, "utf-8");
    const serialized = fs.readFileSync(entrypoint, "utf-8");
    expect(serialized).toEqual(original);
  }

  test("TypeScript", () => testfn(LanguageType.TypeScript));
  test("Python", () => testfn(LanguageType.Python));
});

describe("dump nested closure", () => {
  /*
   * biz-closure -> closure1
   */

  function testfn(lang: LanguageType) {
    const bizClosure = createClosure(() => {}, {
      dirpath: path.join(fixturesDir(lang), "biz-closure" + fileSuffix(lang)),
      exportName: "handler",
    });

    const closure1 = wrapClosure(() => {}, bizClosure, {
      dirpath: path.join(fixturesDir(lang), "closure1" + fileSuffix(lang)),
      placeholder: "__handler_",
      exportName: "handler",
    });

    const outdir = path.join(basedir, "nested-closure" + fileSuffix(lang));
    fs.ensureDirSync(outdir);

    const entrypoint = dumpClosureToDir(outdir, closure1, lang);

    const files = globSync(`${outdir}/**/*`, { nodir: true });
    expect(files).toHaveLength(2);

    const serialized = fs.readFileSync(entrypoint, "utf-8");
    expect(serialized.trim()).toMatch(new RegExp("^" + importPrefix(lang, "__handler_")));
  }

  test("TypeScript", () => testfn(LanguageType.TypeScript));
  test("Python", () => testfn(LanguageType.Python));
});

describe("dump directory closure", () => {
  /*
   * biz-closure -> closure2 (dir)
   */

  function testfn(lang: LanguageType) {
    const bizClosure = createClosure(() => {}, {
      dirpath: path.join(fixturesDir(lang), "biz-closure" + fileSuffix(lang)),
      exportName: "handler",
    });

    const dirClosure = wrapClosure(() => {}, bizClosure, {
      dirpath: path.join(fixturesDir(lang), "closure2"),
      placeholder: "__handler_",
      exportName: "handler",
    });

    const outdir = path.join(basedir, "dir-closure" + fileSuffix(lang));
    fs.ensureDirSync(outdir);

    const entrypoint = dumpClosureToDir(outdir, dirClosure, lang);

    const files = globSync(`${outdir}/*`, { nodir: true });
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.split("/").pop())).toContain("lib" + fileSuffix(lang));

    const serialized = fs.readFileSync(entrypoint, "utf-8");
    expect(serialized.trim()).toMatch(new RegExp("^" + importPrefix(lang, "__handler_")));
  }

  test("TypeScript", () => testfn(LanguageType.TypeScript));
  test("Python", () => testfn(LanguageType.Python));
});

describe("should throw an error if the closure has a placeholder but no child closure", () => {
  function testfn(lang: LanguageType) {
    const dirClosure = createClosure(() => {}, {
      dirpath: path.join(fixturesDir(lang), "closure1" + fileSuffix(lang)),
      placeholder: "__handler_",
      exportName: "handler",
    });

    const outdir = path.join(basedir, "error-no-child-closure");
    fs.ensureDirSync(outdir);

    expect(() => dumpClosureToDir(outdir, dirClosure, lang)).toThrowError(
      /This closure '.*' has a placeholder but no child closure./
    );
  }

  test("TypeScript", () => testfn(LanguageType.TypeScript));
  test("Python", () => testfn(LanguageType.Python));
});

describe("should throw an error if the closure has a child closure but no placeholder", () => {
  function testfn(lang: LanguageType) {
    const bizClosure = createClosure(() => {}, {
      dirpath: path.join(fixturesDir(lang), "biz-closure" + fileSuffix(lang)),
      exportName: "handler",
    });

    const closure1 = wrapClosure(() => {}, bizClosure, {
      dirpath: path.join(fixturesDir(lang), "closure1" + fileSuffix(lang)),
      exportName: "handler",
    });

    const outdir = path.join(basedir, "error-no-placeholder");
    fs.ensureDirSync(outdir);

    expect(() => dumpClosureToDir(outdir, closure1, lang)).toThrowError(
      /This closure '.*' has a child closure but no placeholder./
    );
  }

  test("TypeScript", () => testfn(LanguageType.TypeScript));
  test("Python", () => testfn(LanguageType.Python));
});

describe("dump with exec", () => {
  function testfn(lang: LanguageType) {
    const bizClosure = createClosure(() => {}, {
      dirpath: path.join(fixturesDir(lang), "biz-closure" + fileSuffix(lang)),
      exportName: "handler",
    });

    const outdir = path.join(basedir, "exec-closure" + fileSuffix(lang));
    fs.ensureDirSync(outdir);

    const entrypoint = dumpClosureToDir(outdir, bizClosure, lang, true);

    const files = globSync(`${outdir}/**/*`);
    expect(files).toHaveLength(1);

    const serialized = fs.readFileSync(entrypoint, "utf-8");
    expect(serialized.trim()).toMatch(/handler\(\)$/g);
  }

  test("TypeScript", () => testfn(LanguageType.TypeScript));
  test("Python", () => testfn(LanguageType.Python));
});
