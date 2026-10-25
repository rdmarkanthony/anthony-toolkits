import { _emitter } from "./_emitter";

// counts the target's text from one number to another
// usage: new _countUp({ target, from, to, decimals, duration, events }), a new count on the same target stops the running one
// events: update (count.value, each step), complete
const _running = new WeakMap();

export class _countUp extends _emitter {
    constructor(props) {
        super(props.events);

        this.target = props.target ?? null;

        this.number = {
            from: props.from ?? 0,
            to: props.to ?? 0,
        };
        if (this.number.from === this.number.to) this.number.from = 0;
        this.decimals = props.decimals || null;

        this.duration = props.duration ?? 500;
        this.steps = Math.max(props.steps ?? 10, this.duration / 50);
        this.stepSize = (this.number.to > this.number.from ? this.number.to - this.number.from : this.number.from - this.number.to) / this.steps;

        this.interval = null;
        this.intervalTime = this.duration / this.steps;

        this.animating = false;
        this.value = this.number.from;

        if (this.target) this.init();
    }

    init() {
        _running.get(this.target)?.stop();
        _running.set(this.target, this);

        this.animate();
    }

    animate() {
        this.animating = true;

        let _currentNumber = this.number.from;
        this.updateText(_currentNumber);

        let _stepCount = 0;
        this.interval = setInterval(() => {
            if (this.number.to > this.number.from) {
                _currentNumber += this.stepSize;
            } else {
                _currentNumber -= this.stepSize;
            }

            _stepCount++;
            this.updateText(this.decimals ? _currentNumber : Math.round(_currentNumber));

            if (_stepCount >= this.steps) {
                this.stop();

                this.updateText(this.number.to);
                this.emit("complete");
            }
        }, this.intervalTime);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;

        this.animating = false;

        if (_running.get(this.target) === this) _running.delete(this.target);
    }

    updateText(value) {
        if (!this.target) return;

        this.value = parseFloat(value);
        this.emit("update");

        this.target.innerText = parseFloat(value).toLocaleString("en-US", this.decimals ? { minimumFractionDigits: this.decimals, maximumFractionDigits: this.decimals } : {});
    }
}
