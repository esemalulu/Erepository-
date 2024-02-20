import QAEventsStrategy from './QAEventStrategy';
export default class QAUIBase {
    constructor(eventHandler, options = {}) {
        this.eventHandler = eventHandler;
        //this._eventsStrategy = QSEventsStrategy.create(this, options.eventsStrategy);
        this._eventsStrategy = new QAEventsStrategy(eventHandler, {
            syncStrategy: true
        });
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