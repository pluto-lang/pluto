import { Event } from "../../ala/event";
import { Queue } from "../../ala/queue";
import State from "../../ala/state";

const state = new State("statestore");
const queue = new Queue("access");

queue.subscribe(async (event: Event): Promise<string> => {
    const data = event.data;
    await state.set(data['name'], data['message']);
    return 'receive an event';
})