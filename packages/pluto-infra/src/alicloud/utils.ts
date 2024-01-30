export function currentAliCloudRegion(): string {
  const region = process.env.ALICLOUD_REGION;
  if (!region) {
    throw new Error("Please set the environment variable ALICLOUD_REGION.");
  }
  return region;
}
