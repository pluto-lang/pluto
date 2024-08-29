/**
 * Get the architecture of the current system.
 * @returns The architecture of the current system.
 */
export function getCurrentArch() {
  const currentArch = process.arch === "x64" ? "x86_64" : process.arch;
  return currentArch;
}

/**
 * Get the platform of the current system.
 * @returns The platform of the current system.
 */
export function getCurrentPlatform() {
  return process.platform;
}
