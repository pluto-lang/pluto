import * as path from "path";
import { Program } from "pyright-internal/dist/analyzer/program";
import { SourceFile } from "pyright-internal/dist/analyzer/sourceFile";
import { TypeSearcher } from "../type-searcher";
import * as TypeConsts from "../type-consts";
import * as TestUtils from "./test-utils";

const SAMPLES_ROOT = path.join(__dirname, "samples");

test("should correctly identify special types in the parse tree", () => {
  // Set up
  const samplePath = path.join(SAMPLES_ROOT, "special_type_valid.py");
  const { program, sourceFiles } = TestUtils.parseFiles([samplePath]);

  // Ensure there is only one source file
  expect(sourceFiles.length).toEqual(1);

  testSourceFile(program, sourceFiles[0], {
    constructNodeNum: 6,
    infraApiNodeNum: 4,
    clientApiNodeNum: 1,
    capturedPropNodeNum: 1,
  });
});

test("should correctly identify special types from the indirect method call", () => {
  const code = `
from pluto_client.router import Router

router = Router("router")

indirectFn = router.get
indirectFn("/path", lambda x: x)
`;

  testInlineCode(code, {
    constructNodeNum: 1,
    infraApiNodeNum: 1,
    clientApiNodeNum: 0,
    capturedPropNodeNum: 0,
  });
});

interface ExpectNums {
  readonly constructNodeNum: number;
  readonly infraApiNodeNum: number;
  readonly clientApiNodeNum: number;
  readonly capturedPropNodeNum: number;
}

function testInlineCode(code: string, expectNums: ExpectNums) {
  const { program, sourceFile, clean } = TestUtils.parseCode(code);
  testSourceFile(program, sourceFile, expectNums);
  clean();
}

function testSourceFile(program: Program, sourceFile: SourceFile, expectNums: ExpectNums) {
  const parseTree = sourceFile.getParseResults()?.parseTree;
  expect(parseTree).toBeDefined();

  const walker = new TypeSearcher(program.evaluator!);
  walker.walk(parseTree!);

  const specialTypeNum = [
    expectNums.constructNodeNum,
    expectNums.infraApiNodeNum,
    expectNums.clientApiNodeNum,
    expectNums.capturedPropNodeNum,
  ].filter((num) => num > 0).length;

  const specialNodeMap = walker.specialNodeMap;
  expect(specialNodeMap.getSpicalTypes().length).toEqual(specialTypeNum);

  const constructNodes = specialNodeMap.getNodesByType(TypeConsts.IRESOURCE_FULL_NAME);
  expect(constructNodes?.length ?? 0).toEqual(expectNums.constructNodeNum);

  const infraApiNodes = specialNodeMap.getNodesByType(TypeConsts.IRESOURCE_INFRA_API_FULL_NAME);
  expect(infraApiNodes?.length ?? 0).toEqual(expectNums.infraApiNodeNum);

  const clientApiNodes = specialNodeMap.getNodesByType(TypeConsts.IRESOURCE_CLIENT_API_FULL_NAME);
  expect(clientApiNodes?.length ?? 0).toEqual(expectNums.clientApiNodeNum);

  const capturedPropNodes = specialNodeMap.getNodesByType(
    TypeConsts.IRESOURCE_CAPTURED_PROPS_FULL_NAME
  );
  expect(capturedPropNodes?.length ?? 0).toEqual(expectNums.capturedPropNodeNum);
}
