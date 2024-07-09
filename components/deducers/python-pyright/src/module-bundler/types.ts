export type Runtime = "python3.12" | "python3.11" | "python3.10" | "python3.9" | "python3.8";
export type Architecture = "x86_64" | "arm64";

export interface Module {
  name: string;
  version?: string;
  packageDir?: string;
}
