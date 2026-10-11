// events from props, plus more listeners with on() / off()
// usage: class _myUtil extends _emitter { constructor(props) { super(props.events); } }
export class _emitter {
    constructor(events) {
        this.events = events ?? {};
        this.listeners = {};
    }

    // register event listener
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = new Set();
        this.listeners[event].add(callback);
    }

    // remove event listener
    off(event, callback) {
        this.listeners[event]?.delete(callback);
    }

    // emit certain event
    emit(event) {
        this.events[event]?.(this);
        this.listeners[event]?.forEach((callback) => callback(this));
    }
}
