import * as path from "path";
import { TypeSearcher } from "../type-searcher";
import * as TypeConsts from "../type-consts";
import * as TestUtils from "./test-utils";

const SAMPLES_ROOT = path.join(__dirname, "samples");

test("TypeSearcher should correctly identify special types in the parse tree", () => {
  // Set up
  const samplePath = path.join(SAMPLES_ROOT, "special_type_valid.py");
  const { program, sourceFiles } = TestUtils.parseFiles([samplePath]);

  // Ensure there is only one source file
  expect(sourceFiles.length).toEqual(1);

  // Get the parse tree of the source file
  const parseTree = sourceFiles[0].getParseResults()?.parseTree;
  expect(parseTree).toBeDefined();

  // Create a TypeSearcher instance
  const walker = new TypeSearcher(program.evaluator!, sourceFiles[0]);
  walker.walk(parseTree!);

  // Check the result
  expect(walker.specialNodeMap.size).toEqual(2);

  const constructedNodes = walker.specialNodeMap.get(TypeConsts.IRESOURCE_FULL_NAME);
  expect(constructedNodes?.length).toEqual(5);

  const infraApiNodes = walker.specialNodeMap.get(TypeConsts.IRESOURCE_INFRA_API_FULL_NAME);
  expect(infraApiNodes?.length).toEqual(4);
});
