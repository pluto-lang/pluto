import * as esbuild from "esbuild";

export function bundle(tsPath: string, outdir: string): void {
  const result = esbuild.buildSync({
    bundle: true,
    minify: false,
    entryPoints: [tsPath],
    platform: "node",
    target: "node18",
    outdir: outdir,
  });
  if (result.errors.length > 0) {
    throw new Error("Failed to bundle: " + result.errors[0].text);
  }
}
