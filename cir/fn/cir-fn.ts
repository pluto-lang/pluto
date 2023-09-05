import { Variable } from "@pluto";

let counter = new Variable("counter", Number.prototype);

async function count(name: string): Promise<Number> {
    await counter.add(1);
    return name.length;
}