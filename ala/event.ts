export class Event {
    id: string = "";
    name: string = "";
    topic: string = "";
    data: any;

    static fromAws(record: { [key: string]: any }): Event {
        const snsBody = record['Sns'];
        const msg = JSON.parse(snsBody['Message']);

        const evt = new Event();
        evt.id = snsBody['MessageId'];
        evt.name = msg['pubsubname'];
        evt.topic = msg['topic'];
        evt.data = msg["data"];
        return evt;
    }
}