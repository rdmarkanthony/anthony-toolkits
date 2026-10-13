import { gsap } from "gsap";
import { _event } from "./_event";

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
        this.currentOffset = 0;

        // tweened values
        this.offset = { value: 0 };
        this.width = { value: 0 };

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

        if (!this.numeric)
            gsap.fromTo(
                this.width,
                { value: this.el.numbers[_from].querySelector("span").offsetWidth },
                {
                    value: this.el.numbers[_to].querySelector("span").offsetWidth,
                    duration: (_duration * 0.5) / 1000,
                    delay: (_duration * 0.5) / 1000,
                    ease: "power1.inOut",
                    overwrite: true,
                    onUpdate: () => {
                        this.target.style.width = `${this.width.value}px`;
                    },
                }
            );
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

    // move the digits strip, durations in ms
    tween(from, to, duration, onComplete) {
        gsap.fromTo(
            this.offset,
            { value: from },
            {
                value: to,
                duration: duration / 1000,
                ease: "power1.inOut",
                overwrite: true,
                onUpdate: () => {
                    this.el.main.style.transform = `translate3d(0, -${this.offset.value}px, 0)`;
                    this.currentOffset = this.offset.value;
                },
                onComplete,
            }
        );
    }
}
