import QAEventsStrategy from '../core/QAEventStrategy';

export default class QAControllerBase {
    constructor(parent) {
        this._view = null;
        this._model = null;
        this._instance = null;
        // The eventsStrategy fires events FROM this component.
        this._eventsStrategy = new QAEventsStrategy(qaApp, {
            syncStrategy: true
        });
        this.parent;
        if (parent) {
            this.parent = parent;
            parent.controllers.push(this);
        }
    }

    on(eventName, eventHandler) {
        this._eventsStrategy.on(eventName, eventHandler);
        return this;
    }

    off(eventName, eventHandler) {
        this._eventsStrategy.off(eventName, eventHandler);
        return this;
    }
}