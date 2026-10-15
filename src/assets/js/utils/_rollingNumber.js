import { _event } from "./_event";

// power1.inOut
const _ease = "cubic-bezier(0.455, 0.03, 0.515, 0.955)";

export class _rollingNumber {
    constructor(props) {
        this.target = props.target ?? null;

        this.el = {
            main: document.createElement("div"),
            numbers: [],
        };

        this.numeric = props.numeric ?? true;

        this.maxNumber = Math.min(props.maxNumber ?? 9, 9) + 1;
        this.duration = props.duration ?? 750;
        this.currentNumber = null;
        this.startNumber = props.startNumber ?? 0;

        this.height = 0;

        this.debug = props.debug ?? false;

        if (this.target) this.init();
    }

    init() {
        this.target.appendChild(this.el.main);

        this.target.style.position = "relative";
        this.target.style.overflow = "hidden";

        this.el.main.style.pointerEvents = "none";
        this.el.main.style.willChange = "transform";

        for (let i = 0; i < this.maxNumber; i++) {
            this.createNumber(i);
        }
        this.createNumber(0);
        if (!this.numeric) {
            this.createNumber(",");
            this.createNumber(".");
        }

        this.resize("init");
        _event.resize((state) => {
            if (state !== "init") this.resize();
        });

        if (this.debug) console.log("_rollingNumber", this);
    }

    createNumber(value) {
        let _number = document.createElement("div");
        const _span = document.createElement("span");
        _number.appendChild(_span);

        _span.innerText = value;
        this.el.numbers.push(_number);
        this.el.main.appendChild(_number);
    }

    roll(props) {
        let _from = props?.from ?? this.currentNumber ?? 0;
        let _to = props?.to ?? 0;
        const _duration = props?.duration ?? this.duration;

        if (_to === ",") {
            _to = this.el.numbers.length - 2;
            if (_from === 0) _from = this.maxNumber;
        }
        if (_to === ".") {
            _to = this.el.numbers.length - 1;
            if (_from === 0) _from = this.maxNumber;
        }

        if (this.numeric && this.currentNumber === 0 && _from === 0 && parseFloat(_to) === this.maxNumber - 1) _from = this.el.numbers.length - 1; // for countdowns
        if (_from === _to) return;

        this.tween(_from * this.height, _to * this.height, _duration, () => {
            this.currentNumber = parseFloat(_to);

            if (props.callback) props.callback(this);
        });

        if (!this.numeric) {
            const _width = (index) => `${this.el.numbers[index].querySelector("span").offsetWidth}px`;

            // the width follows in the second half
            this.widthAnimation?.cancel();
            this.target.style.width = _width(_to);
            this.widthAnimation = this.target.animate({ width: [_width(_from), _width(_to)] }, { duration: _duration * 0.5, delay: _duration * 0.5, easing: _ease, fill: "backwards" });
        }
    }

    resize(status) {
        let _height = 0;

        this.el.numbers.forEach((item) => {
            if (item.offsetHeight > _height) _height = item.offsetHeight;
        });

        if (_height === this.height) return;

        if (!this.numeric) this.target.style.width = `${this.el.numbers[this.currentNumber ?? 0].querySelector("span").offsetWidth}px`;

        this.height = _height;
        this.target.style.height = `${_height}px`;

        this.tween(status === "init" ? this.startNumber * this.height : this.currentOffset, (status === "init" ? this.startNumber : this.currentNumber) * this.height, this.duration);
    }

    // where the digits strip is, mid-roll too
    get currentOffset() {
        const _transform = getComputedStyle(this.el.main).transform;
        return _transform === "none" ? 0 : -new DOMMatrix(_transform).m42;
    }

    // move the digits strip, durations in ms
    tween(from, to, duration, onComplete) {
        this.animation?.cancel();
        this.el.main.style.transform = `translate3d(0, -${to}px, 0)`;
        this.animation = this.el.main.animate({ transform: [`translate3d(0, -${from}px, 0)`, `translate3d(0, -${to}px, 0)`] }, { duration, easing: _ease });
        if (onComplete) this.animation.onfinish = onComplete;
    }
}
