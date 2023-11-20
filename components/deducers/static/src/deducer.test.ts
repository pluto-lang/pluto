import ts from "typescript";
import { test, describe, expect } from "vitest";
import { genAnalyzerForInline, genAnalyzerForFile, rmSourceFile } from "./utils-test";
import { ImportElement, ImportType } from "./imports";
import { isResourceType } from "./utils";
import { visitVariableStatement } from "./visit-var-def";
import { visitBinaryExpression, visitCallExpression } from "./visit-expression";

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
              expect(resVarInfo.resourceConstructInfo.importElements[0]).toEqual(nameImportElem);
              break;
            case "obj2":
              expect(resVarInfo.resourceConstructInfo.constructExpression).toEqual("Router");
              expect(resVarInfo.resourceConstructInfo.importElements[0]).toEqual(nameImportElem);
              break;
            case "obj3":
              expect(resVarInfo.resourceConstructInfo.constructExpression).toEqual("pluto.Router");
              expect(resVarInfo.resourceConstructInfo.importElements[0]).toEqual(nsImportElem);
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
import { Router, HttpRequest, HttpResponse } from "@plutolang/pluto";
import * as pluto from "@plutolang/pluto";

let obj1;
obj1 = new Router("obj1");
obj1 = 1;

let obj2, obj3, obj4;
obj2 = new Router("obj2"), obj3 = new Router("obj3"), obj4 = new Router("obj4");

obj3.get("/", async (req: HttpRequest) => Promise<HttpResponse> {
  return {
    statusCode: 200,
    body: "hello"
  };
});
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
      } else if (ts.isCallExpression(childNode)) {
        test("check call expression: " + childNode.getText().split("\n")[0], async () => {
          const union = visitCallExpression(childNode, checker);
          expect(union?.resourceVarInfos).toHaveLength(1);
          expect(union?.resourceRelatInfos).toHaveLength(1);
        });
      }
    }
  });
  rmSourceFile(sourceFile);
});

describe("Invalid call expression", async () => {
  const sourceCode = `
import { Router, HttpRequest, HttpResponse } from "@plutolang/pluto";
import * as pluto from "@plutolang/pluto";

let obj2 = new Router("obj2");

const getFn = obj2.get;
getFn("/", async (req: HttpRequest) => Promise<HttpResponse> {
  return {
    statusCode: 200,
    body: "hello"
  };
});

const getFn2 = getFn;
getFn2("/", async function hello (req: HttpRequest) => Promise<HttpResponse> {
  return {
    statusCode: 200,
    body: "hello"
  };
});

class Cls {
  public add(a: number, b: number): number;
  public add(a: number): number;

  public add(a: number, b: number = 1): number {
    return a + b;
  }
}

const cls = new Cls();
cls.add(1);
`;

  const { sourceFile, checker } = genAnalyzerForFile(sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node)) {
      const childNode = node.expression;
      if (ts.isCallExpression(childNode)) {
        test("check call expression: " + childNode.getText().split("\n")[0], async () => {
          expect(() => visitCallExpression(childNode, checker)).toThrow();
        });
      }
    }
  });
  rmSourceFile(sourceFile);
});
