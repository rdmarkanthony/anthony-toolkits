import { _emitter } from "./_emitter";

// usage: new _rangeSlider({ target, gap, format, outputs, events })
// target (.range-slider) holds one input[type=range], or two for a min and a max, the inputs stay the real values for forms
// target gets --start and --end (0 to 1), outputs (default target .js-range-value) get the values through format
// a press on the track moves the nearest thumb, gap keeps two apart, styles in range-slider.css
export class _rangeSlider extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.gap = props.gap ?? 0;
        this.format = props.format ?? ((value) => value);
        this.outputs = props.outputs ?? null;

        this.inputs = [];
        this.abort = new AbortController();

        if (this.target) this.init();
    }

    init() {
        const { signal } = this.abort;

        this.inputs = [...this.target.querySelectorAll('input[type="range"]')].slice(0, 2);
        this.outputs = [...(this.outputs ?? this.target.querySelectorAll(".js-range-value"))];

        this.inputs.forEach((input, index) => {
            input.addEventListener(
                "input",
                () => {
                    this.keep(index);
                    this.update();
                    this.emit("input");
                },
                { signal }
            );
            input.addEventListener("change", () => this.emit("change"), { signal });
        });

        this.target.addEventListener("pointerdown", (e) => this.press(e), { signal });

        // a form reset puts the values back after the event
        this.inputs[0]?.form?.addEventListener("reset", () => setTimeout(() => this.update()), { signal });

        this.update();
    }

    get values() {
        return this.inputs.map((input) => Number(input.value));
    }

    get min() {
        return Number(this.inputs[0].min || 0);
    }

    get max() {
        return Number(this.inputs[0].max || 100);
    }

    // the moved one stops at the other, gap apart
    keep(index) {
        if (this.inputs.length < 2) return;

        const [_from, _to] = this.values;
        if (index === 0 && _from > _to - this.gap) this.inputs[0].value = _to - this.gap;
        if (index === 1 && _to < _from + this.gap) this.inputs[1].value = _from + this.gap;
    }

    update() {
        const _range = this.max - this.min || 1;
        const _values = this.values;
        const _start = this.inputs.length > 1 ? (_values[0] - this.min) / _range : 0;
        const _end = (_values.at(-1) - this.min) / _range;

        this.target.style.setProperty("--start", _start);
        this.target.style.setProperty("--end", _end);

        // on top when both sit together: the first near the end, so it can still move back
        if (this.inputs.length > 1) {
            const _firstOnTop = _values[0] > this.min + _range / 2;
            this.inputs[0].style.zIndex = _firstOnTop ? 2 : 1;
            this.inputs[1].style.zIndex = _firstOnTop ? 1 : 2;
        }

        this.outputs.forEach((output, i) => this.inputs[i] && (output.textContent = this.format(_values[i], this.inputs[i], i)));
    }

    // the value under the pointer, the input's height is the thumb size
    valueAt(x) {
        const _rect = this.inputs[0].getBoundingClientRect();
        const _thumb = _rect.height;
        const _ratio = Math.min(1, Math.max(0, (x - _rect.left - _thumb / 2) / (_rect.width - _thumb)));
        return this.min + _ratio * (this.max - this.min);
    }

    // presses on the track, the thumbs are the inputs' own drag
    press(e) {
        if (e.button !== 0 || this.inputs.includes(e.target) || !this.inputs.length) return;
        e.preventDefault();

        // the nearest thumb, past both when they sit together
        const _value = this.valueAt(e.clientX);
        const [_from, _to] = this.values;
        let _index = 0;
        if (this.inputs.length > 1) {
            const _toDistance = Math.abs(_value - _to);
            const _fromDistance = Math.abs(_value - _from);
            _index = _toDistance < _fromDistance || (_toDistance === _fromDistance && _value > _to) ? 1 : 0;
        }
        const _input = this.inputs[_index];

        const _move = (x) => {
            const _before = _input.value;
            _input.value = this.valueAt(x);
            if (_input.value !== _before) _input.dispatchEvent(new Event("input", { bubbles: true }));
        };

        _input.focus({ preventScroll: true });
        _move(e.clientX);

        this.target.setPointerCapture(e.pointerId);
        const _drag = new AbortController();
        const _onUp = () => {
            _drag.abort();
            _input.dispatchEvent(new Event("change", { bubbles: true }));
        };
        this.target.addEventListener("pointermove", (event) => _move(event.clientX), { signal: _drag.signal });
        this.target.addEventListener("pointerup", _onUp, { signal: _drag.signal });
        this.target.addEventListener("pointercancel", _onUp, { signal: _drag.signal });
    }

    // no events, like setting input.value
    set(values) {
        [].concat(values).forEach((value, i) => this.inputs[i] && (this.inputs[i].value = value));
        this.keep(1);
        this.update();
    }

    destroy() {
        this.abort.abort();
        this.target.style.removeProperty("--start");
        this.target.style.removeProperty("--end");
        this.inputs.forEach((input) => (input.style.zIndex = ""));
    }
}
