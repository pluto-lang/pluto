import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import PyrightDeducer from "../";

test("should correctly deduce a simple function", async () => {
  const code = `
from pluto_client import (
  Router,
  HttpResponse
)

router_var = Router("router")
router_var.get("/get", lambda req: HttpResponse(status_code=200, body="hello"))
`;
  const { archRef, clean } = await getArchRefForInline(code);

  expect(archRef.resources).toHaveLength(1);
  expect(archRef.relationships).toHaveLength(1);

  const router = archRef.resources[0];
  expect(router.name).toBe("router");
  expect(archRef.relationships[0].from).toMatchObject({ id: router.id });

  clean();
});

test("should correctly deduce the called client apis and accessed captured properties", async () => {
  const code = `
from pluto_client import Router, Queue, Function, HttpResponse

queue = Queue("queue")

func = Function(lambda x: queue.push(x)) # client api call

router = Router("router")


def get_hanlder(request):
    func.invoke(router.url()) # accessed captured property
    return HttpResponse(status_code=200, body="Hello Pluto!")

alias_handler = get_hanlder

router.get("/", alias_handler) # infrastructure call
`;
  const { archRef, clean } = await getArchRefForInline(code);

  expect(archRef.resources).toHaveLength(3);
  expect(archRef.relationships).toHaveLength(4);

  const router = archRef.resources.find((r) => r.name === "router");
  expect(router).toBeDefined();

  const routerRelats = archRef.relationships.filter((r) => r.from.id === router?.id);
  expect(routerRelats).toHaveLength(1);
  const closureId = routerRelats[0].to[0].id;

  const getHdlRelats = archRef.relationships.filter((r) => r.from.id === closureId);
  expect(getHdlRelats).toHaveLength(2);

  clean();
});

test("should correctly deduce the Function arguments", async () => {
  const code = `
from pluto_client import Function, FunctionOptions

default_func = Function(lambda x: x)
named_func = Function(lambda x: x, name="name")
func_with_options = Function(lambda x: x, name="option", options=FunctionOptions(memory=256))
`;
  const { archRef, clean } = await getArchRefForInline(code);

  expect(archRef.resources).toHaveLength(3);

  const defaultFunc = archRef.resources.find((r) => r.name === "default");
  expect(defaultFunc).toBeDefined();

  const namedFunc = archRef.resources.find((r) => r.name === "name");
  expect(namedFunc).toBeDefined();
  expect(namedFunc).toHaveProperty("parameters");
  expect(namedFunc?.parameters).toContainEqual({
    index: 1,
    type: "text",
    name: "name",
    value: '"name"',
  });

  const funcWithOptions = archRef.resources.find((r) => r.name === "option");
  expect(funcWithOptions).toBeDefined();
  const options = funcWithOptions?.parameters?.find((p) => p.name === "options");
  expect(options).toBeDefined();
  expect(options?.value).toMatch('"memory": 256');

  clean();
});

test("should correctly deduce the arguments in the sequence of the function signature parameters.", async () => {
  const code = `
from pluto_client import Website, WebsiteOptions

website = Website("./web", opts=WebsiteOptions(platform="Vercel"))
`;

  const { archRef, clean } = await getArchRefForInline(code);

  expect(archRef.resources).toHaveLength(1);

  const resource = archRef.resources[0];
  expect(resource).toBeDefined();
  expect(resource.parameters).toHaveLength(3);
  expect(resource.parameters[1].value).toEqual("undefined");

  clean();
});

async function getArchRefForInline(code: string, filename: string = "tmp.py") {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "pyright-deducer-"));
  const tmpfile = path.join(tmpdir, filename);
  fs.writeFileSync(tmpfile, code);

  const closureDir = path.join(tmpdir, `closures`);
  const deducer = new PyrightDeducer({
    project: "test",
    rootpath: __dirname,
    closureDir: closureDir,
    stack: {} as any,
  });

  return {
    archRef: (await deducer.deduce([tmpfile])).archRef,
    clean: () => fs.rmSync(tmpdir, { recursive: true }),
  };
}
