import { Request, processEvent, processRequest, Event, setupDapr } from '@pluto';
import { existsSync, lstatSync, readdirSync } from 'fs';
import { join } from 'path';

setupDapr();

function importCIR(dirPath: string): Promise<any>[] {
    const promises: Promise<any>[] = []
    if (!existsSync(dirPath)) return promises;

    if (lstatSync(dirPath).isFile()) {
        console.log('Import CIR: ', dirPath);
        promises.push(import(dirPath));
        return promises;
    }

    const files = readdirSync(dirPath);
    for (const file of files) {
        const filepath = join(dirPath, file);
        if (lstatSync(filepath).isDirectory()) {
            promises.push(...importCIR(filepath));
        } else {
            console.log('Import CIR: ', filepath);
            promises.push(import(filepath));
        }
    }
    return promises;
}

const CIR_DIR = process.env.CIR_DIR || "/app/cir";
console.log("CIR_DIR: ", CIR_DIR);
const promises = importCIR(CIR_DIR);

exports.handler = async (event: any) => {
    await Promise.all(promises);

    console.log(event);
    if ('Records' in event) {  // Trigger Event
        for (const record of event['Records']) {
            const event = Event.fromAws(record);
            await processEvent(event);
        }

    } else { // HTTP Request
        const req = Request.fromAws(event);
        const body = await processRequest(req);

        const response = {
            statusCode: 200,
            body: JSON.stringify(body),
        };
        return response;
    }
};