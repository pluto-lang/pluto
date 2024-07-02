import * as os from "os";
import * as tar from "tar";
import * as path from "path";
import * as fs from "fs-extra";
import JSZip from "jszip";
import axios from "axios";
import { execa } from "@esm2cjs/execa";

// TODO: Obtain this information from the variable provided from the cli.
const BINARY_DIR = (() => {
  const binDir = path.resolve(os.homedir(), ".pluto/bin");
  process.env.PATH = `${binDir}:${process.env.PATH}`;
  fs.ensureDirSync(binDir, { mode: 0o755 });
  return binDir;
})();

const PULUMI_VERSION = "v3.112.0";

export async function needsPulumi(): Promise<boolean> {
  const pulumiPath = path.join(BINARY_DIR, "pulumi");
  try {
    fs.accessSync(pulumiPath);
    const { stdout: output } = await execa(pulumiPath, ["version"]);
    const version = output?.trim();
    return version !== PULUMI_VERSION;
  } catch (error) {
    // The file does not exist or other errors.
    return true;
  }
}

export async function installPulumi(): Promise<void> {
  const getOsArch = (): string => {
    switch (os.platform()) {
      case "darwin":
        return os.arch() === "arm64" ? "darwin-arm64" : "darwin-x64";
      case "linux":
        return os.arch() === "arm64" ? "linux-aarch64" : "linux-x64";
      case "win32":
        return "windows-x64";
      default:
        throw new Error("unsupported operating system");
    }
  };

  const getOsFileExtension = (): string => {
    return os.platform() === "win32" ? ".zip" : ".tar.gz";
  };

  console.info("Starting pulumi installation");
  const osArch = getOsArch();
  const fileExtension = getOsFileExtension();
  const url = `https://get.pulumi.com/releases/sdk/pulumi-${PULUMI_VERSION}-${osArch}${fileExtension}`;

  console.info("Downloading pulumi", { url });
  const response = await axios({
    method: "get",
    url: url,
    responseType: "arraybuffer",
  });

  const pulumiData = response.data;
  const tempFilePath = path.join(BINARY_DIR, `pulumi${fileExtension}`);
  await fs.writeFile(tempFilePath, pulumiData);

  if (fileExtension === ".tar.gz") {
    // Extract tar.gz using tar package
    await tar.x({
      file: tempFilePath,
      cwd: BINARY_DIR,
      strip: 1, // Remove the top-level directory
    });
  } else if (fileExtension === ".zip") {
    // Extract zip file using jszip.
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(pulumiData);
    await Promise.all(
      Object.keys(zipContents.files).map(async (filename) => {
        const fileData = await zipContents.files[filename].async("nodebuffer");
        // Remove the top-level directory
        const filePath = path.join(BINARY_DIR, filename.substring("pulumi/".length));
        await fs.writeFile(filePath, fileData);
      })
    );
  } else {
    throw new Error("Unsupported file extension for Pulumi package");
  }

  await fs.unlink(tempFilePath); // Remove temporary archive file
  console.info("Finished installing pulumi");
}
