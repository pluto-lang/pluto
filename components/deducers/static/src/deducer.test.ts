import ts from "typescript";
import { test, describe, expect } from "vitest";
import { genAnalyzerForInline, genAnalyzerForFile, rmSourceFile } from "./utils-test";
import { isResourceType, visitBinaryExpression, visitVariableStatement } from "./deducer";
import { ImportElement, ImportType } from "./imports";

describe("All types implement Resource", async () => {
  const sourceCode = `
import { Resource } from "@plutolang/base";

class DirectCls implements Resource {}
interface DirectIntf extends Resource {}
interaface DirectCls extends Resource {} // same name with DirectCls

class IndirectCls implements DirectIntf {}
interface IndirectIntf extends DirectIntf {}
interface IndirectCls extends DirectIntf {} // same name with IndirectCls
`;

  const { sourceFile, checker } = genAnalyzerForInline(sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
      test(node.getText(), async () => {
        expect(isResourceType(node, checker)).toBe(true);
      });
    }
  });
});

describe("All types don't implement Resource", async () => {
  const sourceCode = `
import { Resource } from "@plutolang/other";

class DirectCls implements Resource {}
interface DirectIntf extends Resource {}
interaface DirectCls extends Resource {} // same name with DirectCls

class IndirectCls implements DirectIntf {}
interface IndirectIntf extends DirectIntf {}
interface IndirectCls extends DirectIntf {} // same name with IndirectCls
`;

  const { sourceFile, checker } = genAnalyzerForInline(sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
      test(node.getText(), async () => {
        expect(isResourceType(node, checker)).toBe(false);
      });
    }
  });
});

describe("Valid resource variable statements", async () => {
  const sourceCode = `
import { Router } from "@plutolang/pluto";
import * as pluto from "@plutolang/pluto";

const obj1 = new Router("obj1");
const obj2 = new Router("obj2"), obj3 = new pluto.Router("obj3"), obj4;
`;

  const { sourceFile, checker } = genAnalyzerForFile(sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      test("check if there are resource variables: " + node.getText(), async () => {
        const resNum = node.getText().match(/new/g)?.length ?? 0;
        const resVarInfos = visitVariableStatement(node as ts.VariableStatement, checker);
        expect(resVarInfos).toHaveLength(resNum);

        const nameImportElem: ImportElement = {
          type: ImportType.Named,
          name: "Router",
          package: "@plutolang/pluto",
        };
        const nsImportElem: ImportElement = {
          type: ImportType.Namespace,
          name: "pluto",
          package: "@plutolang/pluto",
        };
        for (const resVarInfo of resVarInfos) {
          switch (resVarInfo.varName) {
            case "obj1":
              expect(resVarInfo.resourceConstructInfo.constructExpression).toEqual("Router");
              expect(resVarInfo.resourceConstructInfo.importElement).toEqual(nameImportElem);
              break;
            case "obj2":
              expect(resVarInfo.resourceConstructInfo.constructExpression).toEqual("Router");
              expect(resVarInfo.resourceConstructInfo.importElement).toEqual(nameImportElem);
              break;
            case "obj3":
              expect(resVarInfo.resourceConstructInfo.constructExpression).toEqual("pluto.Router");
              expect(resVarInfo.resourceConstructInfo.importElement).toEqual(nsImportElem);
              break;
          }
        }
      });
    }
  });
  rmSourceFile(sourceFile);
});

describe("Valid expression", async () => {
  const sourceCode = `
import { Router } from "@plutolang/pluto";
import * as pluto from "@plutolang/pluto";

let obj1;
obj1 = new Router("obj1");
obj1 = 1;

let obj2, obj3, obj4;
obj2 = new Router("obj2"), obj3 = new Router("obj3"), obj4 = new Router("obj4");
`;

  const { sourceFile, checker } = genAnalyzerForFile(sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node)) {
      const childNode = node.expression;
      if (ts.isBinaryExpression(childNode)) {
        test("check binary expression: " + childNode.getText(), async () => {
          const resNum = node.getText().match(/new/g)?.length ?? 0;
          const resVarInfos = visitBinaryExpression(childNode, checker);
          expect(resVarInfos).toHaveLength(resNum);
        });
      }
    }
  });
  rmSourceFile(sourceFile);
});
