export function formatName(str: string) {
  if (!/^[A-Za-z]/g.test(str)) {
    throw new Error("All resource names should start with a letter.");
  }
  return str.replaceAll(/([A-Z])/g, (_, g) => g.toLowerCase()).replaceAll(/_/g, "");
}
