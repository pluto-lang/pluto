import { KVStore, Function } from "@plutlang/pluto";

class Klass {
  constructor(private readonly name: string) {
    this.name = name;
  }

  public getName() {
    return this.name;
  }
}

function resourceInFunc(n: string, obj: Klass) {
  // Create a new resource object within the function
  const kvstore = new KVStore(`kvstore${n}`);

  const func = new Function(async () => {
    /**
     * The deployed function is a closure, and
     * the function accesses the complex object passed in from the outside
     */
    console.log(obj.getName());
    /**
     * The deployed function accesses the resource variable created in the local scope
     */
    await kvstore.set("f", `${n}`);
  }, `func${n}`);

  return func;
}

resourceInFunc("1", new Klass("obj1"));
