import * as path from "path";
import { parseFiles } from "./test-utils";
import { ImportFinder } from "../import-finder";
import { Uri } from "pyright-internal/dist/common/uri/uri";
import { PlatformType } from "@plutolang/base";
import { InstalledModule, LocalModule, Module } from "../module-bundler";

test("should correctly identify and list all imported modules in a complex import case", async () => {
  const casePath = path.resolve(__dirname, "./samples/multi-files/complex_import_case");
  const entrypoint = path.join(casePath, "main.py");

  const { program } = parseFiles([entrypoint]);

  const execEnv = program.importResolver
    .getConfigOptions()
    .findExecEnvironment(Uri.file(entrypoint))!;

  const importFinder = new ImportFinder(
    program.importResolver,
    execEnv,
    casePath,
    PlatformType.AWS
  );

  const modules = await importFinder.getImportedModulesForSingleFile(entrypoint);

  const goal: Module[] = [
    InstalledModule.create("pluto_client"),
    LocalModule.create("utils_1", path.resolve(casePath, "utils_1.py")),
    LocalModule.create("utils_2", path.resolve(casePath, "utils_2.py")),
    LocalModule.create("utils_3", path.resolve(casePath, "utils_3.py")),
    LocalModule.create("lib_1", path.resolve(casePath, "lib_1")),
    LocalModule.create("lib_2", path.resolve(casePath, "lib_2")),
  ];

  goal.forEach((m) => expect(modules).toContainEqual(m));
});
