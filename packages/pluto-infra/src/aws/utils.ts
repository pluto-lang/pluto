export function currentAwsRegion(): string {
  const region = process.env.AWS_REGION;
  if (region == undefined) {
    throw new Error("AWS_REGION is not defined");
  }
  return region;
}
