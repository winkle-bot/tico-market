import { EventEmitter } from 'events';

const globalForEvents = global as unknown as { eventBus: EventEmitter };

export const eventBus = globalForEvents.eventBus || new EventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEvents.eventBus = eventBus;
