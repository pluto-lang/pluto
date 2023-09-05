import { Event, Queue, State } from "@pluto";

const state = new State("statestore");
const queue = new Queue("access");

queue.subscribe(async (event: Event): Promise<string> => {
    const data = event.data;
    await state.set(data['name'], data['message']);
    return 'receive an event';
})