import { Queue } from "./queue";

/**
 * @infra faas
 */
type Fn = (...args: any) => any;

export async function emit(fn: Fn, ...args: any) {
    const queue = new Queue(`fn_call_${fn.name}`);
    await queue.push(JSON.stringify(args));
}

export async function invoke(fn: Fn, ...args: any) {
    const queue = new Queue(`fn_call_${fn.name}`);
    await queue.push(JSON.stringify(args));
}