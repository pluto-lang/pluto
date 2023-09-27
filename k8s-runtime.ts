import * as pluto from '@pluto/pluto';
import express, { Request, Response } from 'express';
import { HTTP } from 'cloudevents';
import * as fs from 'fs';


const CIR_DIR = process.env.CIR_DIR || "";
if (CIR_DIR === "" || !fs.existsSync(CIR_DIR)) throw new Error("cannot find 'CIR_DIR' env, or the path 'CIR_DIR' is invalid");
const handleImporter = import(CIR_DIR);


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all("*", async (req: Request, res: Response) => {
    const handle = (await handleImporter).default;

    if (HTTP.isEvent({ headers: req.headers, body: req.body })) {
        const evtBody = JSON.parse(req.body[1])

        const evt = new pluto.Event();
        evt.id = evtBody['id'];
        evt.topic = evtBody['topic'];
        evt.name = evtBody['pubsubname'];
        evt.data = evtBody['data'];
        console.log(evt);

        await handle(evt);

    } else {
        const reqPluto = new pluto.Request();
        for (let key in req.query) {
            reqPluto.query[key] = req.query[key] as string;
        }
        reqPluto.path = req.path;
        console.log(reqPluto);

        const respBody = await handle(req);
        res.send(respBody);
    }
})

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    console.log('Hello world listening on port', port);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        console.log('HTTP server closed')
    })
})