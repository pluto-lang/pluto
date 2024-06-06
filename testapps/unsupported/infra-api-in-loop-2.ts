import { KVStore } from "@plutolang/pluto";

function resourceInFunc(n: string) {
  // Create a new resource object within the function
  const kvstore = new KVStore(`kvstore${n}`);
  return kvstore;
}

/**
 * Create multiple resources through loops
 */
for (let i = 0; i < 5; i++) {
  /**
   * Indirectly create resources by calling functions in the loop
   */
  resourceInFunc(`${i}`);
}
