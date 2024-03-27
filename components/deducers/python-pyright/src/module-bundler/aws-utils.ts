import { Architecture, Runtime } from "./types";

export function baseImageUri(runtime: Runtime, architecture: Architecture): string {
  return `public.ecr.aws/sam/build-${runtime}:latest-${architecture}`;
}
