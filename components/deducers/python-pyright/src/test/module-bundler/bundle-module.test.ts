import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import { randomUUID } from "crypto";
import { bundleModules } from "../../module-bundler/bundle-module";
import { getDefaultPythonRuntime } from "../../module-bundler/command-utils";

function getTmpDir() {
  const tmpdir = path.join(os.tmpdir(), "pluto-test-" + randomUUID());
  fs.ensureDirSync(tmpdir);
  return { tmpdir, cleanup: () => fs.removeSync(tmpdir) };
}

describe("bundleModules", () => {
  test("should bundle modules and remove useless files", async () => {
    const { tmpdir, cleanup } = getTmpDir();

    const runtime = getDefaultPythonRuntime();
    const architecture = "x86_64";
    const modules = [
      { name: "numpy", version: "1.26.4" },
      { name: "pandas" },
      { name: "pydantic" },
    ];
    const targetFolder = tmpdir;
    const options = { slim: true };

    try {
      await bundleModules(runtime, architecture, modules, targetFolder, options);

      const files = fs.readdirSync(targetFolder);
      expect(files).toContain("requirements.txt");
      expect(files).toContain("numpy");
      expect(files).toContain("pandas");
      expect(files).toContain("pydantic");

      expect(files).not.toContain(/dist-info/);
    } finally {
      cleanup();
    }
  });

  test("should throw an error if operating system is not Linux and Docker is disabled", async () => {
    if (process.platform === "linux") {
      // Skip this test on Linux
      return;
    }

    const { tmpdir, cleanup } = getTmpDir();

    const runtime = getDefaultPythonRuntime();
    const architecture = "x86_64";
    const modules = [
      { name: "numpy", version: "1.26.4" },
      { name: "pandas" },
      { name: "pydantic" },
    ];
    const targetFolder = tmpdir;
    const options = { dockerPip: false };

    try {
      await expect(
        bundleModules(runtime, architecture, modules, targetFolder, options)
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

    const defaultRuntime = getDefaultPythonRuntime();
    const runtime = defaultRuntime === "python3.12" ? "python3.11" : "python3.12";
    const architecture = "x86_64";
    const modules = [
      { name: "numpy", version: "1.26.4" },
      { name: "pandas" },
      { name: "pydantic" },
    ];
    const targetFolder = tmpdir;
    const options = { dockerPip: false };

    try {
      await expect(
        bundleModules(runtime, architecture, modules, targetFolder, options)
      ).rejects.toThrow(
        `${runtime} is not installed. Please install it first, or use Docker to bundle modules instead.`
      );
    } finally {
      cleanup();
    }
  });
});
