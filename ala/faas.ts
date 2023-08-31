import { Queue } from "./queue";

type Fn = (...args: any) => any;

/**
 * @infra faas
 * @param fn 
 * @param args 
 */
export async function emit(fn: Fn, ...args: any) {
    const queue = new Queue(`fn_call_${fn.name}`);
    await queue.push(JSON.stringify(args));
}

export async function invoke(fn: Fn, ...args: any) {
    const queue = new Queue(`fn_call_${fn.name}`);
    await queue.push(JSON.stringify(args));
}