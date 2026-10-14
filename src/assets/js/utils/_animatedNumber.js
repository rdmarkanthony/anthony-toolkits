export class _animatedNumber {
    constructor(props) {
        if (!window._animatedNumberList) window._animatedNumberList = [];

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

        if (this.target) this.init(props.callback ?? null);
    }

    init(callback) {
        window._animatedNumberList.forEach((instance) => {
            if (instance.target === this.target) instance.stop();
        });
        window._animatedNumberList.push(this);

        this.animate(callback);
    }

    animate(callback) {
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
            this.updateText(Math.round(_currentNumber));

            if (_stepCount >= this.steps) {
                this.stop();

                this.updateText(this.number.to);

                if (callback) callback(this);
            }
        }, this.intervalTime);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;

        this.animating = false;

        const _index = window._animatedNumberList.indexOf(this);
        if (_index > -1) window._animatedNumberList.splice(_index, 1);
    }

    updateText(value) {
        if (!this.target) return;

        this.target.innerText = parseFloat(value).toLocaleString("en-US", this.decimals ? { minimumFractionDigits: this.decimals, maximumFractionDigits: this.decimals } : {});
    }
}
