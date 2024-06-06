import { Bucket } from "@plutolang/pluto";

/**
 * Create multiple resources through loops
 */
for (let i = 0; i < 5; i++) {
  /**
   * Create resources directly in the loop
   */
  const bucket = new Bucket(`bucket${i}`);
}
