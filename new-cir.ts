
/** CIR */
import { Request } from "@pluto";

import { IRegistry, Registry } from "@pluto";
const reg: IRegistry = new Registry();

const RUNTIME_TYPE = process.env['RUNTIME_TYPE'] || "";
if(RUNTIME_TYPE == "") throw new Error('cannot find env "RUNTIME_TYPE".')

import { register as plutoRegister } from "@pluto";
plutoRegister(reg);

let resDef = null;


resDef = reg.getResourceDef(RUNTIME_TYPE, 'Queue');
const queue = resDef.buildClinet('access');

export default async (req: Request): Promise<string> => {
    const name = req.query['name'] ?? "Anonym";
    const message = `${name} access at ${Date.now()}`
    await queue.push({ name, message });
    return `Publish a message: ${message}`;
}



/** outside code */

exports.handler = async (event: any) => {
    console.log(event);
    
    const req = Request.fromAws(event);
    const body = handler(req);

    const response = {
        statusCode: 200,
        body: JSON.stringify(body),
    };
    return response;
};