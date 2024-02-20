class QACallback {
    constructor(options) {
        this._options = options || {};
        this._list = [];
        this._queue = [];
        this._firing = false;
        this._fired = false;
        this._firingIndexes = [];
    }

    _fireCore(context, args) {
        const firingIndexes = this._firingIndexes;
        const list = this._list;
        const stopOnFalse = this._options.stopOnFalse;
        const step = firingIndexes.length;

        for(firingIndexes[step] = 0; firingIndexes[step] < list.length; firingIndexes[step]++) {
            const result = list[firingIndexes[step]].apply(context, args);

            if(result === false && stopOnFalse) {
                break;
            }
        }

        firingIndexes.pop();
    }

    add(fn) {
        if(typeof fn === 'function' && (!this._options.unique || !this.has(fn))) {
            this._list.push(fn);
        }
        return this;
    }

    remove(fn) {
        const list = this._list;
        const firingIndexes = this._firingIndexes;
        const index = list.indexOf(fn);

        if(index > -1) {
            list.splice(index, 1);

            if(this._firing && firingIndexes.length) {
                for(let step = 0; step < firingIndexes.length; step++) {
                    if(index <= firingIndexes[step]) {
                        firingIndexes[step]--;
                    }
                }
            }
        }

        return this;
    }

    has(fn) {
        const list = this._list;

        return fn ? list.includes(fn) : !!list.length;
    }

    empty(fn) {
        this._list = [];

        return this;
    }

    fireWith(context, args) {
        const queue = this._queue;

        args = args || [];
        args = args.slice ? args.slice() : args;

        if(this._options.syncStrategy) {
            this._firing = true;
            this._fireCore(context, args);
        } else {
            queue.push([context, args]);
            if(this._firing) {
                return;
            }

            this._firing = true;

            while(queue.length) {
                const memory = queue.shift();

                this._fireCore(memory[0], memory[1]);
            }
        }

        this._firing = false;
        this._fired = true;

        return this;
    }

    fire(...args) {
        this.fireWith(this, args);
    }

    fired() {
        return this._fired;
    }
}

export const QACallbacks = options => new QACallback(options);