import { TestWalker } from "pyright-internal/dist/analyzer/testWalker";

export default class PyrightDeducer {
  public async deduce(filePath: string) {
    filePath;
    const walker = new TestWalker();
    walker.visitNode({} as any);
  }
}
