import { ParseNode } from "pyright-internal/dist/parser/parseNodes";
import * as AnalyzerNodeInfo from "pyright-internal/dist/analyzer/analyzerNodeInfo";
import { convertOffsetToPosition } from "pyright-internal/dist/common/positionUtils";
import { EnvVarAccessValue } from "./value-types";

export function getNodeText(node: ParseNode): string {
  const fileInfo = AnalyzerNodeInfo.getFileInfo(node);
  const fileName = fileInfo.fileUri.fileName;
  const startPos = convertOffsetToPosition(node.start, fileInfo.lines);
  return `<${fileName}:${startPos.line + 1}:${startPos.character + 1}>`;
}

export function genEnvVarAccessTextForPython(value: EnvVarAccessValue): string {
  if (value.defaultEnvVarValue) {
    return `os.environ.get("${value.envVarName}","${value.defaultEnvVarValue}")`;
  } else {
    return `os.environ.get("${value.envVarName}")`;
  }
}

export function genEnvVarAccessTextForTypeScript(value: EnvVarAccessValue): string {
  if (value.defaultEnvVarValue) {
    return `process.env["${value.envVarName}"]??"${value.defaultEnvVarValue}"`;
  } else {
    return `process.env["${value.envVarName}"]`;
  }
}
