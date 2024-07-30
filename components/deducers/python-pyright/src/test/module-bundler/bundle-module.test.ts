import * as fs from "fs-extra";
import { getTmpDir } from "../test-utils";
import { InstalledModule, LocalModule, Module, Runtime } from "../../module-bundler";
import { bundleModules } from "../../module-bundler/bundle-module";
import * as CommandUtils from "../../module-bundler/command-utils";

describe("bundle with the local modules", () => {
  test("should correctly bundle with a local module", async () => {
    const { tmpdir, cleanup } = getTmpDir();

    await fs.writeFile(`${tmpdir}/module.py`, "def hello():\n  return 'Hello, world!'\n");

    const runtime = await CommandUtils.getDefaultPythonRuntime();
    const architecture = "x86_64";
    const modules: Module[] = [LocalModule.create("module", `${tmpdir}/module.py`)];

    const targetFolder = `${tmpdir}/bundle`;
    fs.ensureDirSync(targetFolder);
    const bundleDir = targetFolder;
    const sitePackagesDir = `${bundleDir}/site-packages`;
    const options = { dockerPip: false };

    try {
      await expect(
        bundleModules(runtime, architecture, modules, bundleDir, sitePackagesDir, options)
      ).resolves.not.toThrow();

      const files = await fs.readdir(bundleDir);
      expect(files).toContain("module.py");
    } finally {
      cleanup();
    }
  }, /* timeout */ 60000);

  test("should correctly bundle a local package", async () => {
    const { tmpdir, cleanup } = getTmpDir();

    await fs.ensureDir(`${tmpdir}/module`);
    await fs.writeFile(`${tmpdir}/module/__init__.py`, "def hello():\n  return 'Hello, world!'\n");

    const runtime = await CommandUtils.getDefaultPythonRuntime();
    const architecture = "x86_64";
    const modules: Module[] = [LocalModule.create("module", `${tmpdir}/module`)];

    const targetFolder = `${tmpdir}/bundle`;
    fs.ensureDirSync(targetFolder);
    const bundleDir = targetFolder;
    const sitePackagesDir = `${targetFolder}/site-packages`;
    const options = { dockerPip: false };

    try {
      await expect(
        bundleModules(runtime, architecture, modules, bundleDir, sitePackagesDir, options)
      ).resolves.not.toThrow();

      const files = await fs.readdir(bundleDir);
      expect(files).toContain("module");
    } finally {
      cleanup();
    }
  }, /* timeout */ 60000);
});

describe("bundle with the packages that need to install", () => {
  test("should bundle packages and remove useless files", async () => {
    const { tmpdir, cleanup } = getTmpDir();

    const runtime = await CommandUtils.getDefaultPythonRuntime();
    const architecture = "x86_64";
    const modules: Module[] = [
      InstalledModule.create("numpy", "1.26.4"),
      InstalledModule.create("pandas"),
      InstalledModule.create("pydantic"),
    ];
    const targetFolder = tmpdir;
    const options = { slim: true };

    try {
      await bundleModules(runtime, architecture, modules, targetFolder, targetFolder, options);

      const files = fs.readdirSync(targetFolder);
      expect(files).toContain("requirements.txt");
      expect(files).toContain("numpy");
      expect(files).toContain("pandas");
      expect(files).toContain("pydantic");

      expect(files).not.toContain(/dist-info/);
    } finally {
      cleanup();
    }
  }, /* timeout */ 60000);

  test("should throw an error if operating system is not Linux and Docker is disabled", async () => {
    if (process.platform === "linux") {
      // Skip this test on Linux
      return;
    }

    const { tmpdir, cleanup } = getTmpDir();

    const runtime = await CommandUtils.getDefaultPythonRuntime();
    const architecture = "x86_64";
    const modules: Module[] = [
      InstalledModule.create("numpy", "1.26.4"),
      InstalledModule.create("pandas"),
      InstalledModule.create("pydantic"),
    ];
    const targetFolder = tmpdir;
    const options = { dockerPip: false };

    try {
      await expect(
        bundleModules(runtime, architecture, modules, targetFolder, targetFolder, options)
      ).rejects.toThrow(
        "Docker is required to bundle modules on non-Linux platforms, or for cross-architecture."
      );
    } finally {
      cleanup();
    }
  });

  test("should throw an error if Python runtime is not installed and Docker is disabled", async () => {
    if (process.platform !== "linux") {
      // Skip this test on non-Linux platforms
      return;
    }

    const { tmpdir, cleanup } = getTmpDir();

    // Locate a Python runtime between versions 3.8 and 3.12 that has not been installed yet.
    let runtime: Runtime | undefined;
    for (let i = 12; i >= 8; i--) {
      const version = `3.${i}`;
      if (!(await CommandUtils.existCommand(`python${version}`))) {
        runtime = `python${version}` as Runtime;
        break;
      }
    }
    if (runtime === undefined) {
      throw new Error(
        "Python 3.8 - 3.12 are all installed, but one of them should not be installed."
      );
    }

    const architecture = "x86_64";
    const modules: Module[] = [
      InstalledModule.create("numpy", "1.26.4"),
      InstalledModule.create("pandas"),
      InstalledModule.create("pydantic"),
    ];
    const targetFolder = tmpdir;
    const options = { dockerPip: false };

    try {
      await expect(
        bundleModules(runtime, architecture, modules, targetFolder, targetFolder, options)
      ).rejects.toThrow(
        `${runtime} is not installed. Please install it first, or use Docker to bundle modules instead.`
      );
    } finally {
      cleanup();
    }
  });
});
