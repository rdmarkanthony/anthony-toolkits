import { _emitter } from "./_emitter";

// usage: new _typing({ target, lines, speed, eraseSpeed, pause, gap, delay, loop, autoplay, cursor, label, events })
// types each line, erases it, then the next, the last one stays unless loop
// a line is a string or parts [{ text, className }], "\n" breaks it, the css is in typing.css
export class _typing extends _emitter {
    constructor(props = {}) {
        super(props.events);

        this.target = props.target ?? null;
        this.lines = [props.lines ?? this.target?.textContent.trim() ?? ""].flat().map((line) => (typeof line === "string" ? [{ text: line }] : line));

        this.speed = props.speed ?? 60;
        this.eraseSpeed = props.eraseSpeed ?? 28;
        this.pause = props.pause ?? 2000;
        this.gap = props.gap ?? 350;
        this.delay = props.delay ?? 0;
        this.loop = props.loop ?? false;
        this.autoplay = props.autoplay ?? true;
        this.cursorEnabled = props.cursor ?? true;
        this.label = props.label ?? _lineText(this.lines.at(-1));

        this.el = {};
        this.index = 0;
        this.count = 0;
        this.frame = null;
        this.timer = null;

        if (this.target) this.init();
    }

    init() {
        this.original = [...this.target.childNodes];

        // screen readers get the label, the typing is hidden from them
        const _label = _span("typing-label");
        _label.textContent = this.label;

        // invisible copies hold the tallest line's height
        const _box = _span("typing");
        _box.setAttribute("aria-hidden", "true");
        this.lines.forEach((line) => _box.append(_parts(line, "typing-ghost")));

        this.el.text = _parts([], "typing-text");
        if (this.cursorEnabled) this.el.cursor = _span("typing-cursor");
        _box.append(_span("", [this.el.text, this.el.cursor].filter(Boolean)));

        this.target.replaceChildren(_label, _box);
        this.render(this.lines[0], this.autoplay ? 0 : Infinity);

        if (this.autoplay) this.play();
    }

    // shows the first `count` letters of a line
    render(line, count) {
        if (this.line !== line) {
            this.line = line;
            this.el.text.replaceChildren(...line.map(({ className }) => _span(className)));
        }
        this.count = count;

        let _left = Math.round(count);
        let _active = line[0];
        line.forEach((part, index) => {
            const _shown = part.text.slice(0, Math.max(_left, 0));
            if (this.el.text.children[index].textContent !== _shown) this.el.text.children[index].textContent = _shown;
            if (_shown) _active = part;
            _left -= part.text.length;
        });

        // the cursor takes the color of the part being typed
        if (this.el.cursor) this.el.cursor.className = `typing-cursor ${_active?.className ?? ""}`.trim();
    }

    async play() {
        this.stop();

        // reduced motion: the last line, no typing
        if (_reduced()) {
            this.index = this.lines.length - 1;
            this.render(this.lines[this.index], Infinity);
            this.emit("complete");
            return;
        }

        this.index = 0;
        this.render(this.lines[0], 0);
        await this.wait(this.delay);

        while (true) {
            await this.type();
            if (this.index === this.lines.length - 1 && !this.loop) break;

            await this.wait(this.pause);
            await this.erase();
            await this.wait(this.gap);
            this.index = (this.index + 1) % this.lines.length;
        }
        this.emit("complete");
    }

    // type() types the current line, type(line) a new one, a string or parts
    type(line) {
        this.stop();
        const _line = line ? [line].flat().map((part) => (typeof part === "string" ? { text: part } : part)) : this.lines[this.index];
        this.render(_line, 0);
        this.emit("type");
        return this.animate(_lineText(_line).length, this.speed);
    }

    erase() {
        this.stop();
        this.emit("erase");
        return this.animate(0, this.eraseSpeed);
    }

    // count to `to` letters over time, the cursor holds still meanwhile
    animate(to, speed) {
        const _from = Math.min(this.count, _lineText(this.line).length);
        const _duration = _reduced() ? 0 : Math.abs(to - _from) * speed;
        const _start = performance.now();

        return new Promise((resolve) => {
            const _tick = (now) => {
                const _progress = _duration ? Math.min(Math.max(now - _start, 0) / _duration, 1) : 1;
                this.render(this.line, _from + (to - _from) * _progress);
                this.el.cursor?.toggleAttribute("data-busy", _progress < 1);

                if (_progress < 1) this.frame = requestAnimationFrame(_tick);
                else resolve();
            };
            this.frame = requestAnimationFrame(_tick);
        });
    }

    wait(ms) {
        return new Promise((resolve) => (this.timer = setTimeout(resolve, ms)));
    }

    // stops where it is, a running play() never goes on
    stop() {
        cancelAnimationFrame(this.frame);
        clearTimeout(this.timer);
        this.el.cursor?.removeAttribute("data-busy");
    }

    destroy() {
        this.stop();
        this.target.replaceChildren(...this.original);
    }
}

const _reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const _lineText = (line = []) => line.map(({ text }) => text).join("");

const _span = (className, children = []) => {
    const _el = document.createElement("span");
    if (className) _el.className = className;
    _el.append(...children);
    return _el;
};

const _parts = (line, className) => _span(className, line.map(({ text, className }) => _span(className, [text])));
