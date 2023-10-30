export function isPrimitive(val: string): boolean {
  const primitiveTypes = [
    "string",
    "number",
    "boolean",
    "undefined",
    "symbol",
    "bigint",
    "void",
    "any",
    "unknown",
  ];
  return primitiveTypes.indexOf(val) !== -1;
}
