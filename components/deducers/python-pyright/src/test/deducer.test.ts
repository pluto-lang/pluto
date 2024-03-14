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
from pluto_client import Router, Queue, Function, FunctionOptions, HttpResponse

queue = Queue("queue")

func = Function(lambda x: queue.push(x), FunctionOptions(name="func")) # client api call

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

async function getArchRefForInline(code: string, filename: string = "tmp.py") {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "pyright-deducer-"));
  const tmpfile = path.join(tmpdir, filename);
  fs.writeFileSync(tmpfile, code);

  const deducer = new PyrightDeducer({
    project: "test",
    rootpath: __dirname,
    closureDir: "./closures",
    stack: {} as any,
  });

  return {
    archRef: (await deducer.deduce([tmpfile])).archRef,
    clean: () => fs.rmSync(tmpdir, { recursive: true }),
  };
}
