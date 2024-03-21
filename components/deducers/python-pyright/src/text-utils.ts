import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { ParseNode } from "pyright-internal/dist/parser/parseNodes";

export function getTextOfNode(node: ParseNode, sourceFile: SourceFile): string | undefined {
  const fileContents = sourceFile.getFileContent();
  if (fileContents) {
    return fileContents.substring(node.start, node.start + node.length);
  } else {
    return undefined;
  }
}
