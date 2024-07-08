import { ParseNode } from "pyright-internal/dist/parser/parseNodes";
import * as AnalyzerNodeInfo from "pyright-internal/dist/analyzer/analyzerNodeInfo";
import { convertOffsetToPosition } from "pyright-internal/dist/common/positionUtils";

export function getNodeText(node: ParseNode): string {
  const fileInfo = AnalyzerNodeInfo.getFileInfo(node);
  const fileName = fileInfo.fileUri.fileName;
  const startPos = convertOffsetToPosition(node.start, fileInfo.lines);
  return `<${fileName}:${startPos.line + 1}:${startPos.character + 1}>`;
}

export function getPosition(node: ParseNode) {
  const fileInfo = AnalyzerNodeInfo.getFileInfo(node);
  return convertOffsetToPosition(node.start, fileInfo.lines);
}

export * from "pyright-internal/dist/common/positionUtils";
