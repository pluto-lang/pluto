import * as os from "os";
import * as path from "path";
import * as fs from "fs-extra";
import { PythonShell } from "python-shell";
import { IResourceInfra, LanguageType } from "@plutolang/base";
import {
  AnyFunction,
  Function,
  FunctionOptions,
  IFunctionClient,
  IFunctionInfra,
} from "@plutolang/pluto";
import { ComputeClosure } from "@plutolang/base/closure";
import { currentLanguage, genResourceId } from "@plutolang/base/utils";

export class SimFunction implements IResourceInfra, IFunctionClient<AnyFunction>, IFunctionInfra {
  public readonly id: string;
  private readonly closure: ComputeClosure<AnyFunction>;

  constructor(handler: ComputeClosure<AnyFunction>, name?: string, options?: FunctionOptions) {
    this.id = genResourceId(Function.fqn, name ?? "default");

    this.closure = handler;
    name;
    options;
  }

  public url(): string {
    throw new Error("The simulator function URL is currently not supported.");
  }

  public addEventHandler(op: string, args: any[]): void {
    op;
    args;
    throw new Error("Method should not be called.");
  }

  public async cleanup(): Promise<void> {}

  public async invoke(...payload: any[]): Promise<any> {
    if (currentLanguage() === LanguageType.TypeScript) {
      // if the current language is TypeScript, execute the closure directly
      return await this.closure(...payload);
    } else if (currentLanguage() === LanguageType.Python) {
      // if the current language is Python, execute the closure in a Python subprocess
      return await this.executePythonBundle(...payload);
    }
  }

  // Craft a Python script to run the encapsulated function.
  private async executePythonBundle(...payload: any[]) {
    const closureBase = path.dirname(this.closure.dirpath);
    const closureName = path.basename(this.closure.dirpath);
    const args = payload.map((arg) => JSON.stringify(arg));

    const handlerText = PY_HANDLER_TEMPLATE.replaceAll("{CLOSURE_BASE}", closureBase)
      .replaceAll("{CLOSURE_NAME}", closureName)
      .replaceAll("{EXPORT_NAME}", this.closure.exportName)
      .replaceAll("{ARGS}", args.join(", "));

    const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), this.id));
    const tempfile = path.join(tempdir, "handler.py");
    fs.writeFileSync(tempfile, handlerText);

    const result = await executePythonFile(tempfile);
    if (result === "None") {
      return;
    } else {
      return JSON.parse(result ?? "");
    }
  }

  public grantPermission() {}
  public postProcess(): void {}
}

function executePythonFile(filepath: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const pyshell = new PythonShell(filepath, { mode: "text", pythonOptions: ["-u"] });

    let resultMessage: string | undefined;
    pyshell.on("message", function (message) {
      // received a message sent from the Python script (a simple "print" statement)
      if (message.startsWith("PLUTO_PYTHON_RESULT: ")) {
        resultMessage = message.replace("PLUTO_PYTHON_RESULT: ", "");
      } else {
        console.log(message);
      }
    });

    // end the input stream and allow the process to exit
    pyshell.end(function (err, code, signal) {
      if (err) {
        reject(err);
      }

      if (code !== 0) {
        reject(`The exit code was: ${code}, the signal was: ${signal}`);
      }

      resolve(resultMessage);
    });
  });
}

const PY_HANDLER_TEMPLATE = `
import sys
import json
import types


def is_jsonable(x):
  try:
    json.dumps(x)
    return True
  except (TypeError, OverflowError):
    return False


def process_args(args):
  processed_args = []
  for arg in args:
    if isinstance(arg, dict):
      processed_args.append(types.SimpleNamespace(**arg))
    else:
      processed_args.append(arg)
  return processed_args


def serialize_result(result):
  if result is None:
    return "None"
  elif is_jsonable(result):
    return json.dumps(result)
  elif "__dict__" in dir(result):
    return json.dumps(result.__dict__)
  else:
    return str(result)


sys.path.insert(0, "{CLOSURE_BASE}")
from {CLOSURE_NAME} import {EXPORT_NAME}

args = process_args([{ARGS}])
result = {EXPORT_NAME}(*args)

print(f"PLUTO_PYTHON_RESULT: {serialize_result(result)}")
`;
