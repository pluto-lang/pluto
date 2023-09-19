import { Request, Event, setupDapr } from '@pluto/pluto';

setupDapr();

const CIR_DIR = process.env.CIR_DIR || "";
if (CIR_DIR === "") throw new Error("cannot find 'CIR_DIR' env.");
const handleImporter = import(CIR_DIR);

exports.handler = async (event: any) => {
    const handle = (await handleImporter).default;

    console.log(event);
    if ('Records' in event) {  // Trigger Event
        for (const record of event['Records']) {
            const event = Event.fromAws(record);
            await handle(event);
        }

    } else { // HTTP Request
        const req = Request.fromAws(event);
        const body = await handle(req);

        const response = {
            statusCode: 200,
            body: JSON.stringify(body),
        };
        return response;
    }
};