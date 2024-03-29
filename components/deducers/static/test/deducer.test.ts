import * as ts from "typescript";
import { test, describe, expect } from "vitest";
import { genAnalyzerForFile, rmSourceFile } from "./utils";
import { ImportElement, ImportType } from "../src/imports";
import { isResourceType } from "../src/utils";
import { visitVariableStatement } from "../src/visit-var-def";
import { visitBinaryExpression, visitCallExpression } from "../src/visit-expression";

describe("All types implement IResource", async () => {
  const sourceCode = `
import { IResource } from "@plutolang/base";

class DirectCls implements IResource {}
interface DirectIntf extends IResource {}
interface DirectCls extends IResource {} // same name with DirectCls

class IndirectCls implements DirectIntf {}
interface IndirectIntf extends DirectIntf {}
interface IndirectCls extends DirectIntf {} // same name with IndirectCls
`;

  const { sourceFile, checker } = genAnalyzerForFile("all-types-impl-resource.ts", sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
      test(node.getText(), async () => {
        expect(isResourceType(node, checker)).toBe(true);
      });
    }
  });
});

describe("All types don't implement IResource", async () => {
  const sourceCode = `
interface IResource {}

class DirectCls implements IResource {}
interface DirectIntf extends IResource {}
interface DirectCls extends IResource {} // same name with DirectCls

class IndirectCls implements DirectIntf {}
interface IndirectIntf extends DirectIntf {}
interface IndirectCls extends DirectIntf {} // same name with IndirectCls
`;

  const { sourceFile, checker } = genAnalyzerForFile(
    "all-types-do-not-impl-resource.ts",
    sourceCode
  );

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
const obj2 = new Router("obj2"), obj3 = new pluto.Router("obj3");
`;

  const { sourceFile, checker } = genAnalyzerForFile("valid-resource-var-stats.ts", sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      test("check if there are resource variables: " + node.getText(), async () => {
        const resNum = node.getText().match(/new/g)?.length ?? 0;
        const visitResult = visitVariableStatement(node as ts.VariableStatement, checker);
        const resVarInfos = visitResult.resourceVarInfos;
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

let obj2: Router | undefined, obj3: Router | undefined, obj4: Router | undefined;
obj2 = new Router("obj2"), obj3 = new Router("obj3"), obj4 = new Router("obj4");

obj3.get("/", async (req: HttpRequest): Promise<HttpResponse> => {
  return {
    statusCode: 200,
    body: "hello"
  };
});
`;

  const { sourceFile, checker } = genAnalyzerForFile("valid-expressions.ts", sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node)) {
      const childNode = node.expression;
      if (ts.isBinaryExpression(childNode)) {
        test("check binary expression: " + childNode.getText(), async () => {
          const resNum = node.getText().match(/new/g)?.length ?? 0;
          const visitResult = visitBinaryExpression(childNode, checker);
          expect(visitResult?.resourceVarInfos ?? []).toHaveLength(resNum);
        });
      } else if (ts.isCallExpression(childNode)) {
        test("check call expression: " + childNode.getText().split("\n")[0], async () => {
          const union = visitCallExpression(childNode, checker);
          expect(union?.resourceVarInfos).toBeDefined();
          expect(union?.resourceVarInfos).toHaveLength(1);
          expect(union?.resourceRelatInfos).toBeDefined();
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
getFn("/", async (req: HttpRequest): Promise<HttpResponse> => {
  return {
    statusCode: 200,
    body: "hello"
  };
});

const getFn2 = getFn;
getFn2("/", async function hello (req: HttpRequest): Promise<HttpResponse> {
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

  const { sourceFile, checker } = genAnalyzerForFile("invalid-call-expressions.ts", sourceCode);

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

describe("Valid constants accessing", async () => {
  const sourceCode = `
import { Router, HttpRequest, HttpResponse, Queue } from "@plutolang/pluto";
const router = new Router("router");

const constNum = 10;
const constStr = "Hello World!";

const aliasNum = constNum;

const queue = new Queue("queue");
const aliasQueue = queue;

router.get("/store", async (req: HttpRequest): Promise<HttpResponse> => {
  console.log(constNum);
  const anotherNum = constNum + 1;
  const anotherStr = constStr;
  
  const accessAliasNum = aliasNum;

  await queue.push("foo");
  await aliasQueue.push("bar");
  
  return {
    statusCode: 200,
    body: \`Fetch access message.\`,
  };
});
`;
  const { sourceFile, checker } = genAnalyzerForFile("valid-constants-accessing.ts", sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node)) {
      const childNode = node.expression;
      if (!ts.isCallExpression(childNode)) {
        return;
      }

      test("check call expression: " + childNode.getText().split("\n")[0], async () => {
        const union = visitCallExpression(childNode, checker);
        expect(union?.resourceVarInfos).toHaveLength(1);
        expect(union?.resourceVarInfos[0].resourceConstructInfo.locations).toHaveLength(4);
      });
    }
  });

  rmSourceFile(sourceFile);
});

describe("Invalid constants accessing", async () => {
  const sourceCode = `
import { Router, HttpRequest, HttpResponse, Queue } from "@plutolang/pluto";
const router = new Router("router");

const constArr = [1, 2, 3];

router.get("/store", async (req: HttpRequest): Promise<HttpResponse> => {
  constArr.push(3); // not ensure the value can be updated.
  return {
    statusCode: 200,
    body: \`Fetch access message.\`,
  };
});
`;
  const { sourceFile, checker } = genAnalyzerForFile("invalid-constants-accessing.ts", sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node)) {
      const childNode = node.expression;
      if (!ts.isCallExpression(childNode)) {
        return;
      }

      test("check call expression: " + childNode.getText().split("\n")[0], async () => {
        expect(() => visitCallExpression(childNode, checker)).toThrowError();
      });
    }
  });

  rmSourceFile(sourceFile);
});

describe("Valid function calling", async () => {
  const sourceCode = `
import { Router, HttpRequest, HttpResponse, Queue } from "@plutolang/pluto";
const router = new Router("router");

const queue = new Queue("queue");

const constInFn = 10;
async function test(): Promise<string> {
  await queue.push("foo");
  console.log(constInFn);
  return "hello";
}

router.get("/store", async (req: HttpRequest): Promise<HttpResponse> => {
  const str = await test();
  return {
    statusCode: 200,
    body: \`Fetch access message. \${test()}\`,
  };
});
`;
  const { sourceFile, checker } = genAnalyzerForFile("valid-function-calling.ts", sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node)) {
      const childNode = node.expression;
      if (!ts.isCallExpression(childNode)) {
        return;
      }

      test("check call expression: " + childNode.getText().split("\n")[0], async () => {
        const union = visitCallExpression(childNode, checker);
        expect(union?.resourceVarInfos).toHaveLength(1); // lambda
        expect(union?.resourceRelatInfos).toHaveLength(2); // router->lambda; lambda->queue

        expect(union?.resourceVarInfos[0].resourceConstructInfo.locations).toHaveLength(3);
      });
    }
  });

  rmSourceFile(sourceFile);
});

describe("Valid property accessing", async () => {
  const sourceCode = `
import { Router, HttpRequest, HttpResponse, Queue } from "@plutolang/pluto";
const router = new Router("router");

router.get("/store", async (req: HttpRequest): Promise<HttpResponse> => {
  console.log(router.url);
  return {
    statusCode: 200,
    body: \`Fetch access message.\`,
  };
});

const queue = new Queue("queue");

queue.subscribe(async () => {
  const url = router.url;
})
`;
  const { sourceFile, checker } = genAnalyzerForFile("valid-constants-accessing.ts", sourceCode);

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExpressionStatement(node)) {
      const childNode = node.expression;
      if (!ts.isCallExpression(childNode)) {
        return;
      }

      test("check call expression: " + childNode.getText().split("\n")[0], async () => {
        const union = visitCallExpression(childNode, checker);
        expect(union?.resourceVarInfos).toBeDefined();
        expect(union?.resourceVarInfos).toHaveLength(1);
        expect(union?.resourceRelatInfos).toBeDefined();
        expect(union?.resourceRelatInfos).toHaveLength(2);
      });
    }
  });

  rmSourceFile(sourceFile);
});
