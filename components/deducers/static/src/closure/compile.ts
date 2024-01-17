import * as esbuild from "esbuild";

export function compile(tsPath: string, outdir: string, bundle: boolean = true): void {
  const result = esbuild.buildSync({
    bundle: bundle,
    format: "cjs",
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
