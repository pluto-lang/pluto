import os
import shutil
import subprocess

from models import Project
from constants import LANG_ROOT
from config import save_project_config
from stack import create_stack


def process_new(args):
    proj_name = input("Project Name(hello-pluto): ") or "hello-pluto"
    if os.path.exists(proj_name):
        print("The {} already exists.".format(proj_name))
        exit(1)

    proj = Project(proj_name)
    stack = create_stack()
    proj.stacks.append(stack)

    create_project(proj)
    # print("Initializing...")
    # init_project(proj)


example_code = """import { Event, Request, Router, Queue, State } from '@pluto/pluto';

const state = new State("statestore");
const queue = new Queue("access");
const router = new Router("hello");

router.get("/hello", async (req: Request): Promise<string> => {
    const name = req.query['name'] ?? "Anonym";
    const message = `${name} access at ${Date.now()}`
    await queue.push({ name, message });
    return `Publish a message: ${message}`;
})

router.get("/store", async function storeHandler(req: Request): Promise<string> {
    const name = req.query['name'] ?? "Anonym";
    const message = await state.get(name);
    return `Fetch ${name} access message: ${message}.`;
})

queue.subscribe(async (event: Event): Promise<string> => {
    const data = event.data;
    await state.set(data['name'], data['message']);
    return 'receive an event';
})
"""

package_json = """{
  "name": "%{project_name}",
  "version": "1.0.0",
  "description": "",
  "main": "main.ts",
  "scripts": {
  },
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^20.5.9",
    "ts-node": "^10.9.1",
    "typescript": "^5.2.2"
  },
  "dependencies": {
    "@dapr/dapr": "^3.1.2",
    "@pulumi/aws": "^6.0.3",
    "@pulumi/awsx": "^1.0.5",
    "@pulumi/pulumi": "^3.80.0"
  }
}
"""


def create_project(proj: Project):
    save_project_config(f'./{proj.name}', proj)
    with open(os.path.join(proj.name, "main.ts"), "w") as f:
        f.write(example_code)

    # with open(os.path.join(proj.name, "package.json"), "w") as f:
    #     f.write(re.sub('%{project_name}', proj.name, package_json))


def init_project(proj: Project):
    cmd = 'npm install'
    p = subprocess.Popen(cmd.split(' '), cwd=proj.name)
    p.wait()

    module_path = os.path.join(proj.name, "node_modules/@pluto")
    shutil.copytree('{}/pluto'.format(LANG_ROOT), module_path)
