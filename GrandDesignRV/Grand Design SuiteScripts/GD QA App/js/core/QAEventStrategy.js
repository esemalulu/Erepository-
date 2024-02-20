import {QACallbacks} from './QACallbacks';
export default class QAEventsStrategy {
    constructor(owner, options = {}) {
        this._events = {};
        this._owner = owner;
        this._options = options;
    }
    isPlainObject = (object) => {
        if(!object || Object.prototype.toString.call(object) !== '[object Object]') {
            return false;
        }
        const proto = Object.getPrototypeOf(object);
        const ctor = Object.hasOwnProperty.call(proto, 'constructor') && proto.constructor;

        return typeof ctor === 'function'
            && Object.toString.call(ctor) === Object.toString.call(Object);
    };
    static isFunction = (object) => {
        return typeof object === 'function';
    };
    static create(owner, strategy) {
        if(strategy) {
            return QAEventsStrategy.isFunction(strategy) ? strategy(owner) : strategy;
        } else {
            return new QAEventsStrategy(owner);
        }
    }

    hasEvent(eventName) {
        const callbacks = this._events[eventName];
        return callbacks ? callbacks.has() : false;
    }

    fireEvent(eventName, eventArgs) {
        if(!Array.isArray(eventArgs))
            eventArgs = [eventArgs];
        const callbacks = this._events[eventName];
        if(callbacks) {
            callbacks.fireWith(this._owner, eventArgs);
        }
        return this._owner;
    }
    each = (values, callback) => {
        if(!values) return;

        if('length' in values) {
            for(let i = 0; i < values.length; i++) {
                if(callback.call(values[i], i, values[i]) === false) {
                    break;
                }
            }
        } else {
            for(const key in values) {
                if(callback.call(values[key], key, values[key]) === false) {
                    break;
                }
            }
        }

        return values;
    };
    on(eventName, eventHandler) {
        if(this.isPlainObject(eventName)) {
           this.each(eventName, (e, h) => {
                this.on(e, h);
            });
        } else {
            let callbacks = this._events[eventName];

            if(!callbacks) {
                callbacks = QACallbacks({
                    syncStrategy: this._options.syncStrategy
                });
                this._events[eventName] = callbacks;
            }

            const addFn = callbacks.originalAdd || callbacks.add;
            addFn.call(callbacks, eventHandler);
        }
    }

    off(eventName, eventHandler) {
        const callbacks = this._events[eventName];
        if(callbacks) {
            if(QSEventsStrategy.isFunction(eventHandler)) {
                callbacks.remove(eventHandler);
            } else {
                callbacks.empty();
            }
        }
    }

    dispose() {
        this.each(this._events, (eventName, event) => {
            event.empty();
        });
    }
}