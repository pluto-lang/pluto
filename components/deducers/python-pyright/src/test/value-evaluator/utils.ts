import { ParseTreeWalker } from "pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ExpressionNode,
  ParseNode,
  ParseNodeType,
  isExpressionNode,
} from "pyright-internal/dist/parser/parseNodes";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { createValueEvaluator, ValueEvaluator } from "../../value-evaluator";
import * as TestUtils from "../test-utils";

type Validator = (node: ExpressionNode) => void;

class ExpressionWalker extends ParseTreeWalker {
  constructor(
    private readonly sourceFile: SourceFile,
    private readonly validator: Validator
  ) {
    super();
  }

  override visit(node: ParseNode): boolean {
    switch (node.nodeType) {
      case ParseNodeType.Parameter:
      case ParseNodeType.Import:
      case ParseNodeType.ImportAs:
      case ParseNodeType.ImportFrom:
      case ParseNodeType.ImportFromAs:
      case ParseNodeType.Class:
      case ParseNodeType.Lambda:
        return false;
    }

    if (isExpressionNode(node)) {
      this.evaluateValue(node);
      return false;
    }
    return true;
  }

  private evaluateValue(node: ExpressionNode) {
    this.validator(node);
  }
}

export function testInlineCode(
  code: string,
  validatorBuilder: (valueEvaluator: ValueEvaluator, sourceFile: SourceFile) => Validator
) {
  const { program, sourceFile, clean } = TestUtils.parseCode(code);

  const parseTree = sourceFile.getParseResults()?.parseTree;
  expect(parseTree).toBeDefined();

  const valueEvaluator = createValueEvaluator(program.evaluator!);
  const walker = new ExpressionWalker(sourceFile, validatorBuilder(valueEvaluator, sourceFile));

  try {
    walker.walk(parseTree!);
  } finally {
    clean();
  }
}

export function testPyFile(
  path: string,
  validatorBuilder: (valueEvaluator: ValueEvaluator, sourceFile: SourceFile) => Validator
) {
  const { program, sourceFiles } = TestUtils.parseFiles([path]);

  expect(sourceFiles.length).toEqual(1);

  const parseTree = sourceFiles[0].getParseResults()?.parseTree;
  expect(parseTree).toBeDefined();

  const valueEvaluator = createValueEvaluator(program.evaluator!);
  const walker = new ExpressionWalker(
    sourceFiles[0],
    validatorBuilder(valueEvaluator, sourceFiles[0])
  );

  walker.walk(parseTree!);
}
